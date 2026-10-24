<?php
/**
 * rules.php — правила игры «Смена 03».
 * Все цифры совпадают с shift_config() из patient_data.php и game.php.
 */

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/patient_data.php';

$nick  = current_nickname();
$cfg   = shift_config();
$total = count(shift_patients());
$calls = count(shift_dispatches());

$gameUrl = 'game.php' . ($nick !== null ? '?nick=' . urlencode($nick) : '');
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Правила дежурства — Смена 03</title>
  <link rel="stylesheet" href="assets/css/base.css?v=2.2">
  <link rel="stylesheet" href="assets/css/style.css?v=2.2">
  <link rel="stylesheet" href="assets/css/pixel-theme.css?v=2.2">
  <link rel="stylesheet" href="assets/css/rules-pixel.css?v=2.2">
  <link rel="stylesheet" href="assets/css/readability.css?v=2.2">
</head>
<body>

<main class="rules-page">
  <nav class="rules-nav">
    <a href="index.php" class="btn btn-ghost">← В меню</a>
    <a href="<?= e($gameUrl) ?>" class="btn btn-primary">▶ Начать смену</a>
  </nav>

  <header class="rules-header">
    <div class="rules-badge">Инструктаж фельдшера</div>
    <h1 class="rules-title">Смена <span>03</span></h1>
    <p class="rules-subtitle">Регламент ночного дежурства и правила работы с пациентами</p>
  </header>

  <div class="rules-content">

    <!-- БЛОК 01 -->
    <section class="rules-block">
      <div class="rules-block__head">
        <span class="rules-block__tag">01</span>
        <h2>Цель дежурства</h2>
      </div>
      <p>Продержаться одну ночную смену — <b><?= (int) round($cfg['shiftSeconds'] / 60) ?> минут</b>, не потеряв репутацию бригады. За это время через подстанцию проходят <b><?= $total ?> пациентов</b> с острыми состояниями и поступают <b><?= $calls ?> экстренных звонка диспетчера</b>.</p>
      <p>Смена успешно завершается, когда всем пациентам оказана помощь, вышло дежурное время или репутация упала до нуля.</p>
    </section>

    <!-- БЛОК 02 -->
    <section class="rules-block">
      <div class="rules-block__head">
        <span class="rules-block__tag">02</span>
        <h2>Порядок приёма пациента</h2>
      </div>
      <ol class="rules-list">
        <li>
          <span class="rules-list__step-pill">01</span>
          <div><b>Осмотр досье.</b> Открывается пиксельная медицинская карта («Заключение»): жалобы, анамнез и витальные показатели — давление (АД), пульс, температура и сатурация (SpO₂). Смотрим на клиническую картину, а не на имя.</div>
        </li>
        <li>
          <span class="rules-list__step-pill">02</span>
          <div><b>Постановка диагноза.</b> Три варианта с клиническими пиктограммами, верный только один. Ошибка не переключает пациента: вы обязаны поставить верный диагноз, но каждый неверный выбор снимает очки и репутацию.</div>
        </li>
        <li>
          <span class="rules-list__step-pill">03</span>
          <div><b>Алгоритм неотложного лечения.</b> Нажимайте лечебные действия в строгой профессиональной последовательности (нитроглицерин до кислорода, холод до повязки). Ошибочный шаг бьёт по репутации.</div>
        </li>
        <li>
          <span class="rules-list__step-pill">04</span>
          <div><b>Связь с диспетчером.</b> Внезапные вызовы требуют тактических решений: отправить вторую бригаду, запросить реанимацию или выехать на ДТП. Последствия влияют на очки, репутацию и таймер.</div>
        </li>
      </ol>
    </section>

    <!-- БЛОК 03 -->
    <section class="rules-block">
      <div class="rules-block__head">
        <span class="rules-block__tag">03</span>
        <h2>Очки, штрафы и репутация</h2>
      </div>
      <table class="rules-table">
        <thead>
          <tr><th>Клиническое событие</th><th>Счёт смены</th><th>Репутация бригады</th></tr>
        </thead>
        <tbody>
          <tr><td>Верный диагноз</td><td><span class="score-chip score-chip--pos">+<?= (int) $cfg['pointsCorrect'] ?></span></td><td>—</td></tr>
          <tr><td>Лечение в строгом порядке</td><td><span class="score-chip score-chip--pos">+<?= (int) $cfg['pointsTreatment'] ?></span></td><td>—</td></tr>
          <tr><td>Неверный диагноз</td><td><span class="score-chip score-chip--neg">−<?= (int) $cfg['penaltyDiagnosis'] ?></span></td><td><span class="score-chip score-chip--neg">−<?= (int) $cfg['penaltyDiagnosis'] ?></span></td></tr>
          <tr><td>Неверный шаг терапии</td><td>—</td><td><span class="score-chip score-chip--neg">−<?= (int) $cfg['penaltyTreatment'] ?></span></td></tr>
          <tr><td>Решение по вызову диспетчера</td><td><span class="score-chip score-chip--pos">от −20 до +40</span></td><td><span class="score-chip score-chip--pos">от −25 до +15</span></td></tr>
        </tbody>
      </table>
      <p class="rules-note">Репутация бригады стартует со 100 единиц. Если она упадёт до 0, смена проваливается досрочно независимо от запаса времени.</p>
    </section>

    <!-- БЛОК 04 -->
    <section class="rules-block">
      <div class="rules-block__head">
        <span class="rules-block__tag">04</span>
        <h2>Прокачка и оснащение подстанции</h2>
      </div>
      <p>За завершённые смены, спасённых пациентов и успешные учебные операции вы зарабатываете <b>опыт (XP)</b> и <b>бюджет больницы (₽)</b>. Награда начисляется только после финала, а не за отдельные клики.</p>
      <p>Покупки доступны в <b>личном кабинете на главной странице</b>: тележка неотложной помощи, дефибриллятор «Аксион», монитор витальных функций, фарм-холодильник и диспетчерская радиостанция.</p>
      <p>У каждого улучшения есть четыре требования: бюджет, XP, число спасённых пациентов и число завершённых смен. Уровни больницы открываются строго по порядку — быстро прокачать всю подстанцию не получится.</p>
    </section>

    <!-- БЛОК 05 -->
    <section class="rules-block">
      <div class="rules-block__head">
        <span class="rules-block__tag">05</span>
        <h2>Таймер и режим паузы</h2>
      </div>
      <ul class="rules-list">
        <li><span class="rules-list__bullet">▪</span> <div>Базовая длительность смены — <b><?= (int) round($cfg['shiftSeconds'] / 60) ?> минут</b>. Таймер отображается в верхней панели HUD, последние 60 секунд мигают предупреждением.</div></li>
        <li><span class="rules-list__bullet">▪</span> <div>Пауза активируется кнопкой <b>⏸</b> или клавишей <b>P</b> / <b>Esc</b>. Время останавливается, текущее состояние пациента сохраняется.</div></li>
        <li><span class="rules-list__bullet">▪</span> <div>Кнопка «Завершить смену» фиксирует набранные очки и отправляет результат в таблицу рекордов.</div></li>
      </ul>
    </section>

    <!-- БЛОК 06 -->
    <section class="rules-block">
      <div class="rules-block__head">
        <span class="rules-block__tag">06</span>
        <h2>Автосохранение дежурства</h2>
      </div>
      <p>Игра сохраняет дежурство по нику каждые 20 секунд, при паузе и перед закрытием вкладки браузера. Никнейм — от 3 до 16 символов, без паролей и регистраций.</p>
      <p>Вернувшись на главную страницу под тем же ником, вы можете в один клик нажать «Продолжить смену» с сохранённого пациента.</p>
    </section>

    <!-- БЛОК 07 -->
    <section class="rules-block">
      <div class="rules-block__head">
        <span class="rules-block__tag">07</span>
        <h2>Итоги дежурства и рейтинг</h2>
      </div>
      <ul class="rules-list">
        <li><span class="rules-list__bullet">▪</span> <div><b>Успешная сдача:</b> все 8 пациентов обслужены, репутация выше нуля. Начисляется премия к бюджету подстанции.</div></li>
        <li><span class="rules-list__bullet">▪</span> <div><b>Истечение времени:</b> дежурство завершается по звонку утренней пересменки, набранные очки засчитываются.</div></li>
        <li><span class="rules-list__bullet">▪</span> <div><b>Провал:</b> репутация достигла 0. Разбор полётов у главврача.</div></li>
      </ul>
    </section>

  </div>

  <div class="rules-footer">
    <a href="index.php" class="btn btn-ghost">← В меню</a>
    <a href="<?= e($gameUrl) ?>" class="btn btn-primary btn-lg">▶ Заступить на смену</a>
  </div>
</main>

</body>
</html>
