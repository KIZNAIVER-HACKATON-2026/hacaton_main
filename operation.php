<?php
/** Учебный режим: иммобилизация перелома без графических сцен. */
require_once __DIR__ . '/includes/bootstrap.php';

$nick = current_nickname();
if ($nick === null) {
    header('Location: index.php#cabinet');
    exit;
}
remember_nickname($nick);
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Учебная операция — Смена 03</title>
  <link rel="stylesheet" href="assets/css/operation.css?v=3.0">
  <link rel="stylesheet" href="assets/css/pixel-theme.css?v=3.0">
</head>
<body class="operation-body">
<header class="op-hud"><a class="op-brand" href="index.php"><span>03</span><b><?= e($nick) ?></b></a><div class="op-hud__title">Учебная операция · иммобилизация</div><div class="op-hud__stats"><span>Время <b id="op-time">03:00</b></span><span>Счёт <b id="op-score">0</b></span><span>Точность <b id="op-rep">100</b></span></div></header>
<main class="operation-main">
  <section class="op-intro"><div><p class="op-kicker">Режим 02 · безопасный сценарий</p><h1>Иммобилизация перелома</h1><p>Собери спокойный учебный сценарий фиксации предплечья. На экране только схема и инструменты — без крови, расчленёнки и реалистичных травм.</p></div><a href="index.php#cabinet" class="op-back">← В личный кабинет</a></section>
  <section class="op-board" aria-live="polite">
    <aside class="op-patient"><div class="op-patient__label">Учебный манекен · случай 17</div><div class="arm-scene" id="arm-scene"><div class="arm-scene__shoulder"></div><div class="arm-scene__arm"></div><div class="arm-scene__forearm"></div><div class="arm-scene__hand"><i></i><i></i><i></i></div><div class="arm-scene__pad"></div><div class="arm-scene__cast"></div><div class="arm-scene__bandage"></div></div><p class="op-patient__note" id="visual-note">Осмотр: визуальная схема руки без изображения травмы.</p><div class="op-checklist" id="op-checklist"></div></aside>
    <section class="op-work"><div class="op-step"><span id="op-step-number">Шаг 1 из 5</span><span class="op-safe">учебная симуляция</span></div><h2 id="op-question">Подготовка сценария</h2><p id="op-description">Выберите безопасное действие по порядку.</p><div class="op-actions" id="op-actions"></div><p class="op-feedback" id="op-feedback" role="status"></p></section>
  </section>
</main>
<div class="op-final" id="op-final" hidden><div class="op-final__card"><span id="op-final-label">Сценарий завершён</span><h2 id="op-final-title">Фиксация выполнена</h2><p id="op-final-text">—</p><div class="op-final__stats"><div><span>Счёт</span><b id="op-final-score">0</b></div><div><span>Точность</span><b id="op-final-accuracy">0%</b></div><div><span>Награда</span><b id="op-final-reward">+90 ₽ · +50 XP</b></div></div><p id="op-final-save">Записываем результат…</p><div class="op-final__actions"><a class="op-button" id="op-again" href="operation.php?nick=<?= urlencode($nick) ?>">Ещё сценарий</a><a class="op-button op-button--flat" href="index.php#cabinet">В кабинет</a></div></div></div>
<script>window.OPERATION = <?= json_encode(['nick' => $nick, 'endpoint' => 'api/score.php'], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
<script src="assets/js/operation.js?v=3.0"></script>
</body></html>
