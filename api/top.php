<?php
/**
 * api/top.php — топ игроков.
 *
 * GET ?limit=5  (1..50)
 *
 * Ответ: { ok:true, db:true, players:[{rank,nickname,score,finished_at}], stats:{...} }
 * Эндпоинт же использует главная страница для фонового обновления табло.
 */

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$limit = (int) ($_GET['limit'] ?? 5);
$limit = max(1, min(50, $limit));

$dbOk = data_db_ok();

if (!$dbOk) {
    out_db_down();
}

jout([
    'ok'      => true,
    'db'      => true,
    'players' => db_top_players($limit),
    'stats'   => db_stats(),
]);
