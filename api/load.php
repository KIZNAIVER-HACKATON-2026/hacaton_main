<?php
/**
 * api/load.php — загрузка сохранения по нику.
 *
 * GET ?nickname=Фельдшер01
 *
 * Ответ: { ok:true, db:true, nickname, save:{score,reputation,remaining_seconds,patient_index,saved_at}|null }
 */

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

if (!data_db_ok()) {
    out_db_down();
}

$nick = clean_nickname($_GET['nickname'] ?? null);
if ($nick === null) {
    jout(['ok' => false, 'db' => true, 'error' => 'bad_nickname'], 422);
}

$player = db_find_player($nick);
if (!$player) {
    jout([
        'ok'       => true,
        'db'       => true,
        'nickname' => $nick,
        'save'     => null,
    ]);
}

jout([
    'ok'       => true,
    'db'       => true,
    'nickname' => $player['nickname'],
    'save'     => save_for_player((int) $player['player_id']),
]);
