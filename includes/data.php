<?php
/**
 * includes/data.php — все запросы к БД «Смена 03».
 *
 * Контракт для страниц: функции ниже — единственное место, где есть SQL.
 * Любая функция при недоступной БД возвращает пустое значение, а не падает,
 * поэтому главная страница открывается и без MySQL (с заглушкой).
 */

require_once __DIR__ . '/db.php';

/** Есть ли живое подключение к БД (для бейджа на главной). */
function data_db_ok(): bool
{
    return db_or_null() !== null;
}

/**
 * Топ игроков: лучшая смена на человека, сортировка по очкам.
 * Возвращает [['nickname','score','finished_at','rank'], ...]
 */
function db_top_players(int $limit = 5): array
{
    $pdo = db_or_null();
    if (!$pdo) return [];

    // одна строка на игрока: берём его лучшую смену, при равенстве — самую раннюю.
    // Без оконных функций, чтобы работало и на MySQL 5.7.
    $sql = "SELECT p.nickname, b.score, b.finished_at
              FROM (
                    SELECT r1.player_id, r1.score, MIN(r1.finished_at) AS finished_at
                      FROM records r1
                      JOIN (
                            SELECT player_id, MAX(score) AS best
                              FROM records
                          GROUP BY player_id
                      ) m ON m.player_id = r1.player_id AND m.best = r1.score
                  GROUP BY r1.player_id, r1.score
              ) b
              JOIN players p ON p.player_id = b.player_id
          ORDER BY b.score DESC, b.finished_at ASC
             LIMIT :lim";

    try {
        $st = $pdo->prepare($sql);
        $st->bindValue(':lim', max(1, $limit), PDO::PARAM_INT);
        $st->execute();
        $rows = $st->fetchAll();
    } catch (Throwable $e) {
        error_log('[shift03] top players: ' . $e->getMessage());
        return [];
    }

    foreach ($rows as $i => &$row) {
        $row['score'] = (int) $row['score'];
        $row['rank'] = $i + 1;
    }
    unset($row);

    return $rows;
}

/**
 * Сводка для плашек на главной.
 * players — сколько ников заведено, shifts — сдано смен, best — рекорд.
 */
function db_stats(): array
{
    $empty = ['players' => 0, 'shifts' => 0, 'best' => 0, 'avg' => 0];
    $pdo = db_or_null();
    if (!$pdo) return $empty;

    try {
        $players = (int) $pdo->query('SELECT COUNT(*) FROM players')->fetchColumn();
        $row = $pdo->query('SELECT COUNT(*) AS shifts, COALESCE(MAX(score),0) AS best, COALESCE(ROUND(AVG(score)),0) AS avg FROM records')->fetch();
        return [
            'players' => $players,
            'shifts'  => (int) ($row['shifts'] ?? 0),
            'best'    => (int) ($row['best'] ?? 0),
            'avg'     => (int) ($row['avg'] ?? 0),
        ];
    } catch (Throwable $e) {
        error_log('[shift03] stats: ' . $e->getMessage());
        return $empty;
    }
}

/** Последние сданные смены: [['nickname','score','finished_at'], ...] */
function db_recent_runs(int $limit = 4): array
{
    $pdo = db_or_null();
    if (!$pdo) return [];

    try {
        $st = $pdo->prepare(
            "SELECT p.nickname, r.score, r.finished_at
               FROM records r
               JOIN players p ON p.player_id = r.player_id
           ORDER BY r.finished_at DESC, r.record_id DESC
              LIMIT :lim"
        );
        $st->bindValue(':lim', max(1, $limit), PDO::PARAM_INT);
        $st->execute();
        $rows = $st->fetchAll();
    } catch (Throwable $e) {
        error_log('[shift03] recent runs: ' . $e->getMessage());
        return [];
    }

    foreach ($rows as &$row) {
        $row['score'] = (int) $row['score'];
    }
    unset($row);

    return $rows;
}

/** Полный лидерборд с местами (для страницы рекордов / панели). */
function db_leaderboard(int $limit = 50): array
{
    $pdo = db_or_null();
    if (!$pdo) return [];

    try {
        $st = $pdo->prepare(
            "SELECT p.nickname, b.score, b.finished_at
               FROM (
                     SELECT r1.player_id, r1.score, MIN(r1.finished_at) AS finished_at
                       FROM records r1
                       JOIN (
                             SELECT player_id, MAX(score) AS best
                               FROM records
                           GROUP BY player_id
                       ) m ON m.player_id = r1.player_id AND m.best = r1.score
                   GROUP BY r1.player_id, r1.score
               ) b
               JOIN players p ON p.player_id = b.player_id
           ORDER BY b.score DESC, b.finished_at ASC
              LIMIT :lim"
        );
        $st->bindValue(':lim', max(1, $limit), PDO::PARAM_INT);
        $st->execute();
        $rows = $st->fetchAll();
    } catch (Throwable $e) {
        error_log('[shift03] leaderboard: ' . $e->getMessage());
        return [];
    }

    foreach ($rows as $i => &$row) {
        $row['score'] = (int) $row['score'];
        $row['rank'] = $i + 1;
    }
    unset($row);

    return $rows;
}

/**
 * Лучший результат игрока и его место в топе.
 * Возвращает ['best' => int, 'rank' => int] или null, если смен ещё не было.
 */
function db_record_summary_best(int $playerId): ?array
{
    $pdo = db_or_null();
    if (!$pdo) return null;

    try {
        $st = $pdo->prepare('SELECT MAX(score) FROM records WHERE player_id = ?');
        $st->execute([$playerId]);
        $best = $st->fetchColumn();

        if ($best === false || $best === null) return null;
        $best = (int) $best;

        $st = $pdo->prepare('SELECT COUNT(DISTINCT player_id) FROM records WHERE score > ?');
        $st->execute([$best]);
        $rank = 1 + (int) $st->fetchColumn();

        return ['best' => $best, 'rank' => $rank];
    } catch (Throwable $e) {
        error_log('[shift03] record summary best: ' . $e->getMessage());
        return null;
    }
}

/** Игрок по нику: ['player_id','nickname','created_at'] или null. */
function db_find_player(string $nickname): ?array
{
    $pdo = db_or_null();
    if (!$pdo) return null;

    try {
        $st = $pdo->prepare('SELECT player_id, nickname, created_at FROM players WHERE nickname = ? LIMIT 1');
        $st->execute([$nickname]);
        $row = $st->fetch();
        return $row ?: null;
    } catch (Throwable $e) {
        error_log('[shift03] find player: ' . $e->getMessage());
        return null;
    }
}

/**
 * Найти или создать игрока. Возвращает player_id или null при ошибке БД.
 */
function db_upsert_player(string $nickname): ?int
{
    $pdo = db_or_null();
    if (!$pdo) return null;

    $existing = db_find_player($nickname);
    if ($existing) return (int) $existing['player_id'];

    try {
        $st = $pdo->prepare('INSERT INTO players (nickname) VALUES (?)');
        $st->execute([$nickname]);
        return (int) $pdo->lastInsertId();
    } catch (Throwable $e) {
        // гонка двух запросов на один ник — просто читаем существующего
        $again = db_find_player($nickname);
        if ($again) return (int) $again['player_id'];
        error_log('[shift03] upsert player: ' . $e->getMessage());
        return null;
    }
}

/** Сохранить состояние смены (одно на игрока, перезапись). */
function db_save_state(int $playerId, array $state): bool
{
    $pdo = db_or_null();
    if (!$pdo) return false;

    $json = json_encode($state, JSON_UNESCAPED_UNICODE);
    if ($json === false) return false;

    try {
        $st = $pdo->prepare(
            'INSERT INTO saves (player_id, state_json)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE state_json = VALUES(state_json), saved_at = CURRENT_TIMESTAMP'
        );
        $st->execute([$playerId, $json]);
        return true;
    } catch (Throwable $e) {
        error_log('[shift03] save state: ' . $e->getMessage());
        return false;
    }
}

/** Загрузить сохранение: ['state' => array, 'saved_at' => string] или null. */
function db_load_save(int $playerId): ?array
{
    $pdo = db_or_null();
    if (!$pdo) return null;

    try {
        $st = $pdo->prepare('SELECT state_json, saved_at FROM saves WHERE player_id = ? LIMIT 1');
        $st->execute([$playerId]);
        $row = $st->fetch();
        if (!$row) return null;

        $state = json_decode($row['state_json'], true);
        if (!is_array($state)) return null;

        return ['state' => $state, 'saved_at' => $row['saved_at']];
    } catch (Throwable $e) {
        error_log('[shift03] load save: ' . $e->getMessage());
        return null;
    }
}

/**
 * Записать результат смены.
 * submission_token защищает от даблклика: повтор с тем же токеном не создаёт дубль.
 * Возвращает ['record_id','score','is_best','best','rank'] или null.
 */
function db_submit_score(int $playerId, int $score, string $token): ?array
{
    $pdo = db_or_null();
    if (!$pdo) return null;

    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $token)) {
        return null;
    }

    try {
        $st = $pdo->prepare('SELECT record_id FROM records WHERE submission_token = ? LIMIT 1');
        $st->execute([$token]);
        $recordId = $st->fetchColumn();

        if ($recordId === false) {
            $ins = $pdo->prepare('INSERT INTO records (player_id, score, submission_token) VALUES (?, ?, ?)');
            $ins->execute([$playerId, $score, $token]);
            $recordId = (int) $pdo->lastInsertId();
        } else {
            $recordId = (int) $recordId;
        }

        return db_record_summary($playerId, $recordId);
    } catch (Throwable $e) {
        error_log('[shift03] submit score: ' . $e->getMessage());
        return null;
    }
}

/** Итоги записи: своя лучшая смена и место в общем топе. */
function db_record_summary(int $playerId, int $recordId): ?array
{
    $pdo = db_or_null();
    if (!$pdo) return null;

    try {
        $st = $pdo->prepare('SELECT score FROM records WHERE record_id = ? LIMIT 1');
        $st->execute([$recordId]);
        $score = (int) $st->fetchColumn();

        $st = $pdo->prepare('SELECT COALESCE(MAX(score),0) FROM records WHERE player_id = ?');
        $st->execute([$playerId]);
        $best = (int) $st->fetchColumn();

        $st = $pdo->prepare('SELECT COUNT(DISTINCT player_id) FROM records WHERE score > ?');
        $st->execute([$best]);
        $rank = 1 + (int) $st->fetchColumn();

        return ['record_id' => $recordId, 'score' => $score, 'best' => $best, 'rank' => $rank];
    } catch (Throwable $e) {
        error_log('[shift03] record summary: ' . $e->getMessage());
        return null;
    }
}

/** Справочник диагнозов из БД (6 записей из seed.sql). */
function db_diagnoses(): array
{
    $pdo = db_or_null();
    if (!$pdo) return [];

    try {
        return $pdo->query('SELECT diagnosis_id, title, short_description FROM diagnoses ORDER BY diagnosis_id')->fetchAll();
    } catch (Throwable $e) {
        error_log('[shift03] diagnoses: ' . $e->getMessage());
        return [];
    }
}
