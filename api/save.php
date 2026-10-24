<?php
/**
 * api/save.php — автосейв смены.
 *
 * POST {nickname, state:{score, reputation, remainingSeconds, patientIndex, version}}
 *
 * Тело запроса может быть JSON или обычной формой. Состояние пишется
 * одной строкой на игрока (таблица saves), повторный вызов перезаписывает.
 *
 * Ответ: { ok:true, db:true, saved_at:"YYYY-MM-DD HH:MM:SS" }
 */

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

require_post();

if (!data_db_ok()) {
    out_db_down();
}

$data = request_data();

$nick = clean_nickname($data['nickname'] ?? null);
if ($nick === null) {
    jout(['ok' => false, 'db' => true, 'error' => 'bad_nickname'], 422);
}

$state = $data['state'] ?? null;
if (is_string($state)) {
    $state = json_decode($state, true);
}
if (!is_array($state)) {
    jout(['ok' => false, 'db' => true, 'error' => 'bad_state'], 422);
}

// оставляем только известные поля и приводим типы
$clean = [
    'version'          => (int) ($state['version'] ?? 1),
    'score'            => max(0, (int) ($state['score'] ?? 0)),
    'reputation'       => max(0, min(100, (int) ($state['reputation'] ?? 100))),
    'remainingSeconds' => max(0, (int) ($state['remainingSeconds'] ?? 0)),
    'patientIndex'     => max(0, (int) ($state['patientIndex'] ?? 0)),
    'savedAt'          => date('c'),
];

$playerId = db_upsert_player($nick);
if ($playerId === null) {
    out_db_down();
}

if (!db_save_state($playerId, $clean)) {
    jout(['ok' => false, 'db' => true, 'error' => 'save_failed'], 500);
}

jout([
    'ok'       => true,
    'db'       => true,
    'nickname' => $nick,
    'saved_at' => date('Y-m-d H:i:s'),
]);
