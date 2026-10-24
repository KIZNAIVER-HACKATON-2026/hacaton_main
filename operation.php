<?php
/** Случайно назначаемый неграфический хирургический тренажёр. */
require_once __DIR__ . '/includes/bootstrap.php';

$nick = current_nickname();
$operationScenarios = require __DIR__ . '/includes/operation_scenarios.php';
$scenario = $operationScenarios[random_int(0, count($operationScenarios) - 1)];
// ?scenario=<id> — принудительный выбор сценария (удобно для тестов и демо на защите).
if (isset($_GET['scenario']) && is_string($_GET['scenario'])) {
    foreach ($operationScenarios as $candidate) {
        if ($candidate['id'] === $_GET['scenario']) { $scenario = $candidate; break; }
    }
}
if ($nick === null) {
    header('Location: index.php#cabinet');
    exit;
}
remember_nickname($nick);
$storyProgress = [
    'shifts_finished' => 0,
    'operations_finished' => 0,
    'operations_success' => 0,
    'hospital_level' => 0,
];
$storyOperation = [];
$player = db_find_player($nick);
if ($player) {
    // Сюжет: реплики после операции из уже открытых эпизодов (например, эпизод 3 «Не вся вина на тебе»).
    $storyState = story_load((int) $player['player_id']);
    if ($storyState !== null) {
        foreach (story_data()['episodes'] as $episode) {
            if (empty($episode['after_operation']) || (int) $episode['number'] > (int) $storyState['episode'] + 1) continue;
            $lines = [];
            foreach ($episode['after_operation'] as $line) {
                $item = ['speaker' => $line['speaker'], 'text' => str_replace('{nick}', $nick, $line['text'])];
                if ($line['speaker'] === 'hero') $item['name'] = $nick . ' · фельдшер';
                $lines[] = $item;
            }
            $storyOperation[] = ['key' => 'story-op-' . $episode['id'], 'title' => 'Эпизод ' . $episode['number'] . ' · «' . $episode['title'] . '»', 'lines' => $lines];
        }
    }
    $dashboard = db_player_dashboard((int) $player['player_id']);
    if (!empty($dashboard['profile'])) {
        foreach ($storyProgress as $key => $default) {
            $storyProgress[$key] = (int) ($dashboard['profile'][$key] ?? $default);
        }
    }
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= e($scenario['title']) ?> · Учебная операция</title>
  <link rel="stylesheet" href="assets/css/operation.css?v=3.2">
  <link rel="stylesheet" href="assets/css/pixel-theme.css?v=3.0">
  <link rel="stylesheet" href="assets/css/operation-pixel.css?v=3.2">
  <link rel="stylesheet" href="assets/css/story-dialogue.css?v=2.0">
  <link rel="stylesheet" href="assets/css/operation-dnd.css?v=2.0">
  <link rel="stylesheet" href="assets/css/sound.css?v=1.0">
</head>
<body class="operation-body">
<header class="op-hud"><a class="op-brand" href="index.php"><span>03</span><b><?= e($nick) ?></b></a><div class="op-hud__title">Учебная операция · инструменты</div><div class="op-hud__stats"><span>Время <b id="op-time">03:00</b></span><span>Счёт <b id="op-score">0</b></span><span>Точность <b id="op-rep">100</b></span></div><span class="snd-slot" data-sound-slot></span></header>
<main class="operation-main">
  <section class="op-intro"><div><p class="op-kicker">Учебная операция · сценарий выпадает случайно</p><h1><?= e($scenario['title']) ?></h1><p>Перетащите нужные инструменты со стола к пациенту в правильном порядке. Лишние оставьте на столе.</p></div><a href="index.php#cabinet" class="op-back">← В кабинет</a></section>
  <section class="op-board op-board--dnd" aria-live="polite">
    <aside class="op-patient">
      <div class="op-dropzone" id="op-dropzone" aria-label="Пациент: перетащите сюда инструмент">
        <div class="op-dropzone__scene" id="arm-scene"></div>
        <div class="op-dropzone__hint" id="op-drop-hint">Перетащите инструмент сюда</div>
      </div>
    </aside>
    <section class="op-work">
      <div class="op-step"><span id="op-step-number">Шаг 1 из 5</span><span class="op-progress" id="op-progress" aria-hidden="true"></span></div>
      <h2 id="op-question">Подготовка</h2>
      <p id="op-description">Перетаскивайте инструменты со стола к пациенту.</p>
      <p class="op-feedback" id="op-feedback" role="status"></p>
      <div class="op-table">
        <div class="op-table__head"><span>Инструментальный стол</span></div>
        <div class="op-tray" id="op-tray"></div>
      </div>
    </section>
  </section>
</main>
<div class="op-final" id="op-final" hidden><div class="op-final__card"><span id="op-final-label">Сценарий завершён</span><h2 id="op-final-title">Сценарий завершён</h2><p id="op-final-text">—</p><div class="op-final__stats"><div><span>Счёт</span><b id="op-final-score">0</b></div><div><span>Точность</span><b id="op-final-accuracy">0%</b></div><div><span>Награда</span><b id="op-final-reward">+90 ₽ · +50 XP</b></div></div><p id="op-final-save">Записываем результат…</p><div class="op-final__actions"><a class="op-button" id="op-again" href="operation.php?nick=<?= urlencode($nick) ?>">Ещё сценарий</a><a class="op-button op-button--flat" href="index.php#cabinet">В кабинет</a></div></div></div>
<script>window.OPERATION = <?= json_encode(['nick' => $nick, 'endpoint' => 'api/score.php', 'storyProgress' => $storyProgress, 'storyOperation' => $storyOperation, 'scenario' => $scenario], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
<script src="assets/js/sound.js?v=1.0"></script>
<script src="assets/js/story-dialogue.js?v=2.1"></script>
<script src="assets/js/operation.js?v=5.3"></script>
</body></html>
