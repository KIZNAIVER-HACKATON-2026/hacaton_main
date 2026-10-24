<?php
/**
 * api/score.php — отправка результата смены.
 *
 * POST {nickname, score, token, mode?, saved?, success?}
 *   token — UUID, создаётся клиентом один раз на финал игры.
 *           Повторная отправка с тем же токеном не создаёт дубль
 *           и не начисляет прогресс повторно.
 *   mode — shift | operation; saved и success нужны для серверной награды.
 *
 * Ответ: { ok:true, db:true, score, best, rank, record_id, profile }
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

$scoreRaw = $data['score'] ?? null;
if (!is_numeric($scoreRaw)) {
    jout(['ok' => false, 'db' => true, 'error' => 'bad_score'], 422);
}
$score = (int) $scoreRaw;
if ($score < 0 || $score > 100000) {
    jout(['ok' => false, 'db' => true, 'error' => 'score_out_of_range'], 422);
}

$token = $data['token'] ?? '';
if (!is_string($token) || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $token)) {
    jout(['ok' => false, 'db' => true, 'error' => 'bad_token'], 422);
}

$playerId = db_upsert_player($nick);
if ($playerId === null) {
    out_db_down();
}

$summary = db_submit_score($playerId, $score, strtolower($token));
if ($summary === null) {
    jout(['ok' => false, 'db' => true, 'error' => 'submit_failed'], 500);
}

// Прогресс начисляется только для новой строки рекорда: повторная отправка
// того же UUID не позволит фармить бюджет перезагрузкой страницы.
$mode = ($data['mode'] ?? 'shift') === 'operation' ? 'operation' : 'shift';
$saved = is_numeric($data['saved'] ?? null) ? (int) $data['saved'] : 0;
$success = !empty($data['success']);
$profile = null;
if (!empty($summary['is_new'])) {
    $profile = db_apply_game_reward($playerId, $mode, $saved, $success);
}

jout([
    'ok'        => true,
    'db'        => true,
    'nickname'  => $nick,
    'score'     => $summary['score'],
    'best'      => $summary['best'],
    'rank'      => $summary['rank'],
    'record_id' => $summary['record_id'],
    'profile'   => $profile,
]);
