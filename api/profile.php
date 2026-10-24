<?php
/**
 * api/profile.php — данные и покупки личного кабинета.
 * GET  ?nickname=...                       — статистика и прогресс
 * POST { action:"purchase", nickname, kind, id } — покупка улучшения
 */

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

if (!data_db_ok()) out_db_down();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $nick = clean_nickname($_GET['nickname'] ?? null);
    if ($nick === null) jout(['ok' => false, 'error' => 'bad_nickname'], 422);

    $player = db_find_player($nick);
    if (!$player) {
        jout(['ok' => true, 'exists' => false, 'nickname' => $nick, 'dashboard' => null]);
    }

    jout([
        'ok' => true,
        'exists' => true,
        'nickname' => $player['nickname'],
        'dashboard' => db_player_dashboard((int) $player['player_id']),
    ]);
}

require_post();
$data = request_data();
$nick = clean_nickname($data['nickname'] ?? null);
if ($nick === null) jout(['ok' => false, 'error' => 'bad_nickname'], 422);

$playerId = db_upsert_player($nick);
if ($playerId === null) out_db_down();

$action = is_string($data['action'] ?? null) ? $data['action'] : '';
if ($action !== 'purchase') jout(['ok' => false, 'error' => 'unknown_action'], 404);

$kind = is_string($data['kind'] ?? null) ? $data['kind'] : '';
$id = is_scalar($data['id'] ?? null) ? (string) $data['id'] : '';
$result = db_purchase_progression($playerId, $kind, $id);

if (!$result['ok']) {
    jout([
        'ok' => false,
        'error' => $result['error'] ?? 'purchase_failed',
        'dashboard' => db_player_dashboard($playerId),
    ], 422);
}

jout([
    'ok' => true,
    'nickname' => $nick,
    'item' => $result['item'],
    'dashboard' => db_player_dashboard($playerId),
]);
