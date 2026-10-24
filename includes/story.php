<?php
/**
 * includes/story.php — сюжет «Вернуться на линию»: данные эпизодов и прогресс игрока.
 *
 * Прогресс хранится в отдельной таблице player_story (одна строка на игрока).
 * Таблица создаётся автоматически при первом обращении — и в MySQL, и в SQLite,
 * поэтому миграция database/migration_2026_story.sql необязательна.
 *
 * Правило продвижения: эпизод N можно завершить, только если пройдено N-1 эпизодов.
 * Повторная отправка того же эпизода ничего не меняет (идемпотентно), а эффекты
 * выбора берутся из данных сервера по номеру варианта — клиент не может
 * «накрутить» отношения.
 */

require_once __DIR__ . '/db.php';

/** Все данные сезона (кэшируются на запрос). */
function story_data(): array
{
    static $data = null;
    if ($data === null) {
        $data = require __DIR__ . '/story_episodes.php';
    }
    return $data;
}

function story_episode_count(): int
{
    return count(story_data()['episodes']);
}

/** Эпизод по номеру (1..N) или null. */
function story_episode(int $number): ?array
{
    foreach (story_data()['episodes'] as $episode) {
        if ((int) $episode['number'] === $number) return $episode;
    }
    return null;
}

/** Создать таблицу player_story, если её нет. */
function story_table_ensure(PDO $pdo): bool
{
    static $ready = [];
    $key = spl_object_id($pdo);
    if (isset($ready[$key])) return $ready[$key];

    try {
        if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
            $pdo->exec('CREATE TABLE IF NOT EXISTS player_story (
                player_id INTEGER NOT NULL PRIMARY KEY,
                episode INTEGER NOT NULL DEFAULT 0,
                team INTEGER NOT NULL DEFAULT 0,
                self_trust INTEGER NOT NULL DEFAULT 0,
                flags_json TEXT NULL,
                choices_json TEXT NULL,
                ending VARCHAR(32) NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )');
        } else {
            $pdo->exec('CREATE TABLE IF NOT EXISTS player_story (
                player_id INT UNSIGNED NOT NULL PRIMARY KEY,
                episode TINYINT UNSIGNED NOT NULL DEFAULT 0,
                team TINYINT NOT NULL DEFAULT 0,
                self_trust TINYINT NOT NULL DEFAULT 0,
                flags_json TEXT NULL,
                choices_json TEXT NULL,
                ending VARCHAR(32) NULL,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci');
        }
        return $ready[$key] = true;
    } catch (Throwable $e) {
        error_log('[shift03] story table: ' . $e->getMessage());
        return $ready[$key] = false;
    }
}

/** Пустое состояние сюжета. */
function story_default_state(): array
{
    return [
        'episode' => 0,      // сколько эпизодов пройдено
        'team'    => 0,      // «доверие команде»
        'self'    => 0,      // «доверие себе»
        'flags'   => [],
        'choices' => [],     // ep1 => индекс варианта, ...
        'ending'  => null,
        'updated_at' => null,
    ];
}

function story_row_to_state(?array $row): array
{
    $state = story_default_state();
    if (!$row) return $state;
    $flags = json_decode((string) ($row['flags_json'] ?? ''), true);
    $choices = json_decode((string) ($row['choices_json'] ?? ''), true);
    $state['episode'] = max(0, min(story_episode_count(), (int) $row['episode']));
    $state['team'] = (int) $row['team'];
    $state['self'] = (int) $row['self_trust'];
    $state['flags'] = is_array($flags) ? array_values(array_filter($flags, 'is_string')) : [];
    $state['choices'] = is_array($choices) ? $choices : [];
    $state['ending'] = $row['ending'] !== null && $row['ending'] !== '' ? (string) $row['ending'] : null;
    $state['updated_at'] = $row['updated_at'] ?? null;
    return $state;
}

/** Прогресс игрока. При недоступной БД — null. */
function story_load(int $playerId): ?array
{
    $pdo = db_or_null();
    if (!$pdo || !story_table_ensure($pdo)) return null;
    try {
        $st = $pdo->prepare('SELECT * FROM player_story WHERE player_id = ? LIMIT 1');
        $st->execute([$playerId]);
        $row = $st->fetch() ?: null;
        return story_row_to_state($row);
    } catch (Throwable $e) {
        error_log('[shift03] story load: ' . $e->getMessage());
        return null;
    }
}

function story_store(PDO $pdo, int $playerId, array $state): bool
{
    $params = [
        $playerId,
        (int) $state['episode'],
        (int) $state['team'],
        (int) $state['self'],
        json_encode(array_values(array_unique($state['flags'])), JSON_UNESCAPED_UNICODE),
        json_encode((object) $state['choices'], JSON_UNESCAPED_UNICODE),
        $state['ending'],
    ];
    $sql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite'
        ? 'INSERT INTO player_story (player_id, episode, team, self_trust, flags_json, choices_json, ending) VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(player_id) DO UPDATE SET episode = excluded.episode, team = excluded.team, self_trust = excluded.self_trust,
           flags_json = excluded.flags_json, choices_json = excluded.choices_json, ending = excluded.ending, updated_at = CURRENT_TIMESTAMP'
        : 'INSERT INTO player_story (player_id, episode, team, self_trust, flags_json, choices_json, ending) VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE episode = VALUES(episode), team = VALUES(team), self_trust = VALUES(self_trust),
           flags_json = VALUES(flags_json), choices_json = VALUES(choices_json), ending = VALUES(ending), updated_at = CURRENT_TIMESTAMP';
    $st = $pdo->prepare($sql);
    return $st->execute($params);
}

/** Концовка по накопленным отношениям: первая подходящая из списка. */
function story_pick_ending(int $team, int $self): array
{
    $endings = story_data()['endings'];
    foreach ($endings as $ending) {
        if (isset($ending['min_team']) && $team < (int) $ending['min_team']) continue;
        if (isset($ending['min_self']) && $self < (int) $ending['min_self']) continue;
        return $ending;
    }
    return end($endings);
}

/**
 * Завершить эпизод.
 * $choice — индекс выбранного варианта сюжетного звонка или null (звонок не успел прозвучать).
 * Возвращает ['ok'=>bool, 'applied'=>bool, 'state'=>array, 'error'=>?string].
 */
function story_complete(int $playerId, int $episodeNumber, ?int $choice): array
{
    $pdo = db_or_null();
    if (!$pdo || !story_table_ensure($pdo)) return ['ok' => false, 'applied' => false, 'error' => 'db_unavailable'];

    $episode = story_episode($episodeNumber);
    if (!$episode) return ['ok' => false, 'applied' => false, 'error' => 'unknown_episode'];

    try {
        $pdo->beginTransaction();
        $st = $pdo->prepare('SELECT * FROM player_story WHERE player_id = ? LIMIT 1');
        $st->execute([$playerId]);
        $state = story_row_to_state($st->fetch() ?: null);

        // Уже пройден (повторная отправка) или игрок пытается перескочить эпизод.
        if ($state['episode'] !== $episodeNumber - 1) {
            $pdo->commit();
            return ['ok' => true, 'applied' => false, 'state' => $state, 'error' => $state['episode'] >= $episodeNumber ? 'already_done' : 'out_of_order'];
        }

        $options = $episode['call']['options'] ?? [];
        if ($choice !== null && isset($options[$choice])) {
            $effect = $options[$choice]['story'] ?? [];
            $state['team'] = max(-10, min(20, $state['team'] + (int) ($effect['team'] ?? 0)));
            $state['self'] = max(-10, min(20, $state['self'] + (int) ($effect['self'] ?? 0)));
            foreach (($effect['flags'] ?? []) as $flag) $state['flags'][] = (string) $flag;
            $state['choices'][$episode['id']] = $choice;
        }

        $state['episode'] = $episodeNumber;
        if ($episodeNumber >= story_episode_count()) {
            $state['ending'] = story_pick_ending($state['team'], $state['self'])['id'];
        }

        story_store($pdo, $playerId, $state);
        $pdo->commit();
        $state['flags'] = array_values(array_unique($state['flags']));
        return ['ok' => true, 'applied' => true, 'state' => $state];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('[shift03] story complete: ' . $e->getMessage());
        return ['ok' => false, 'applied' => false, 'error' => 'story_failed'];
    }
}

/** Начать сезон заново. */
function story_reset(int $playerId): ?array
{
    $pdo = db_or_null();
    if (!$pdo || !story_table_ensure($pdo)) return null;
    try {
        $state = story_default_state();
        story_store($pdo, $playerId, $state);
        return $state;
    } catch (Throwable $e) {
        error_log('[shift03] story reset: ' . $e->getMessage());
        return null;
    }
}

/** Сюжетный пациент в формате game_patients() (нужен patient_data.php). */
function story_build_patient(array $p): ?array
{
    if (!function_exists('diagnosis_index') || !function_exists('get_pixel_portraits')) return null;
    $index = diagnosis_index();
    $portraits = get_pixel_portraits();
    $diagArt = function_exists('get_pixel_diagnoses') ? get_pixel_diagnoses() : [];
    $options = [];
    foreach ($p['options'] as $id) {
        $options[] = [
            'id'    => $id,
            'label' => $index[$id]['title'] ?? ('Диагноз #' . $id),
            'icon'  => $index[$id]['icon'] ?? '❓',
            'svg'   => $diagArt[$id] ?? '',
        ];
    }
    return [
        'id'           => $p['id'],
        'fio'          => $p['fio'],
        'short'        => $p['short'],
        'age'          => $p['age'],
        'emoji'        => $p['emoji'],
        'svg'          => $portraits[$p['portrait'] ?? 1] ?? '',
        'avatarBg'     => $p['avatarBg'],
        'symptoms'     => $p['symptoms'],
        'vitals'       => $p['vitals'],
        'options'      => $options,
        'correct'      => $p['correct'],
        'correctTitle' => $index[$p['correct']]['title'] ?? '—',
        'treatment'    => $p['treatment'],
        'note'         => $p['note'],
        'story'        => true,
    ];
}

/**
 * Данные для фронтенда: сезон целиком + состояние игрока.
 * $state === null означает «БД недоступна» — тогда клиент ведёт прогресс в localStorage.
 */
function story_client_payload(?array $state, array $profile = [], bool $withPatients = false): array
{
    $data = story_data();
    $episodes = [];
    foreach ($data['episodes'] as $episode) {
        if (isset($episode['patient'])) {
            $patient = $withPatients ? story_build_patient($episode['patient']) : null;
            $episode['patient'] = $patient ? ['index' => (int) $episode['patient']['index'], 'data' => $patient] : null;
        }
        $episodes[] = $episode;
    }

    $envFlags = [];
    if (in_array('radio', $profile['equipment'] ?? [], true)) $envFlags[] = 'radio';

    return [
        'season'   => $data['season'],
        'prologue' => $data['prologue'],
        'episodes' => $episodes,
        'endings'  => $data['endings'],
        'epilogue' => $data['epilogue'],
        'state'    => $state,
        'envFlags' => $envFlags,
        'dbOk'     => $state !== null,
    ];
}

/** Имя отправителя SMS: «неизвестный номер» раскрывается после 5-го эпизода. */
function story_sender_name(string $from, array $state): string
{
    if ($from === 'unknown') return (int) $state['episode'] >= 5 ? 'Громов' : 'Неизвестный номер';
    return ['gromov' => 'Громов', 'sonya' => 'Соня', 'vera' => 'Вера', 'ilya' => 'Илья', 'petr' => 'Пётр Андреевич'][$from] ?? 'Подстанция 03';
}

/** Последнее полученное SMS для главного экрана: ['name','text','episode','unknown'] или null. */
function story_latest_message(array $state, string $nick = ''): ?array
{
    $latest = null;
    foreach (story_data()['episodes'] as $episode) {
        if (!empty($episode['phone']) && (int) $episode['number'] <= (int) $state['episode']) $latest = $episode;
    }
    if (!$latest) return null;
    $name = story_sender_name($latest['phone']['from'], $state);
    return [
        'name'    => $name,
        'text'    => str_replace('{nick}', $nick, $latest['phone']['text']),
        'episode' => (int) $latest['number'],
        'unknown' => $name === 'Неизвестный номер',
    ];
}

