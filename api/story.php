<?php
/**
 * api/story.php — прогресс сюжета «Вернуться на линию».
 *
 * GET  ?nickname=...                                  → { ok, state }
 * POST { action:"complete", nickname, episode, choice } → { ok, applied, state, ending? }
 * POST { action:"reset", nickname }                     → { ok, state }
 *
 * Эпизод продвигается после любой завершённой смены — даже провальной или
 * с нулевым счётом: история не должна «застревать». Повторная отправка
 * того же эпизода ничего не меняет.
 */

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

if (!data_db_ok()) {
    out_db_down();
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$data = $method === 'POST' ? request_data() : $_GET;

$nick = clean_nickname($data['nickname'] ?? null);
if ($nick === null) {
    jout(['ok' => false, 'error' => 'bad_nickname'], 422);
}

if ($method === 'GET') {
    $player = db_find_player($nick);
    $state = $player ? story_load((int) $player['player_id']) : story_default_state();
    if ($state === null) out_db_down();
    jout(['ok' => true, 'nickname' => $nick, 'state' => $state]);
}

require_post();

$playerId = db_upsert_player($nick);
if ($playerId === null) {
    out_db_down();
}

$action = (string) ($data['action'] ?? 'complete');

if ($action === 'reset') {
    $state = story_reset($playerId);
    if ($state === null) out_db_down();
    jout(['ok' => true, 'nickname' => $nick, 'state' => $state]);
}

if ($action !== 'complete') {
    jout(['ok' => false, 'error' => 'unknown_action'], 422);
}

$episode = (int) ($data['episode'] ?? 0);
if ($episode < 1 || $episode > story_episode_count()) {
    jout(['ok' => false, 'error' => 'bad_episode'], 422);
}

$choice = $data['choice'] ?? null;
$choice = ($choice === null || $choice === '') ? null : max(0, (int) $choice);

$result = story_complete($playerId, $episode, $choice);
if (!$result['ok']) {
    jout(['ok' => false, 'error' => $result['error'] ?? 'story_failed'], 500);
}

$payload = [
    'ok'       => true,
    'nickname' => $nick,
    'applied'  => $result['applied'],
    'state'    => $result['state'],
];
if (!$result['applied'] && !empty($result['error'])) $payload['note'] = $result['error'];
if (!empty($result['state']['ending'])) {
    $ending = story_pick_ending((int) $result['state']['team'], (int) $result['state']['self']);
    $payload['ending'] = $ending['id'] === $result['state']['ending'] ? $ending : null;
}

jout($payload);
