<?php
/**
 * api/player.php — вход в игру по нику.
 *
 * GET  ?action=status&nickname=...   — есть ли такой игрок и его сохранение
 * POST action=start {nickname}       — найти или создать игрока, отдать сейв
 *
 * Ответы:
 *   { ok:true, db:true, exists:bool, nickname, save:{...}|null, best:int|null,
 *     dashboard:{ profile, best, rank, records, average } }
 *   { ok:false, db:false, error:"db_unavailable" }   — база недоступна (503)
 */

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

if (!data_db_ok()) {
    out_db_down();
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'status';
$action = is_string($action) ? $action : 'status';

if ($action === 'status') {
    $nick = clean_nickname($_GET['nickname'] ?? null);
    if ($nick === null) {
        jout(['ok' => false, 'db' => true, 'error' => 'bad_nickname'], 422);
    }

    $player = db_find_player($nick);
    if (!$player) {
        jout([
            'ok'       => true,
            'db'       => true,
            'exists'   => false,
            'nickname' => $nick,
            'save'     => null,
            'best'     => null,
        ]);
    }

    $playerId = (int) $player['player_id'];
    $summary  = db_record_summary_best($playerId);
    $save     = save_for_player($playerId);

    jout([
        'ok'       => true,
        'db'       => true,
        'exists'   => true,
        'nickname' => $player['nickname'],
        'save'     => $save,
        'best'     => $summary,
        'dashboard' => db_player_dashboard($playerId),
    ]);
}

if ($action === 'start') {
    require_post();
    $data = request_data();

    $nick = clean_nickname($data['nickname'] ?? null);
    if ($nick === null) {
        jout(['ok' => false, 'db' => true, 'error' => 'bad_nickname'], 422);
    }

    $player   = db_find_player($nick);
    $created  = false;

    if ($player) {
        $playerId = (int) $player['player_id'];
    } else {
        $playerId = db_upsert_player($nick);
        $created  = true;
    }

    if ($playerId === null) {
        out_db_down();
    }

    jout([
        'ok'       => true,
        'db'       => true,
        'created'  => $created,
        'nickname' => $nick,
        'player_id' => $playerId,
        'save'     => save_for_player($playerId),
        'best'     => db_record_summary_best($playerId),
        'dashboard' => db_player_dashboard($playerId),
    ]);
}

jout(['ok' => false, 'db' => true, 'error' => 'unknown_action'], 404);
