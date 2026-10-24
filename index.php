<?php
/** Главная страница и личный кабинет «Смена 03». */
require_once __DIR__ . '/includes/bootstrap.php';

if (isset($_GET['logout'])) {
    setcookie('shift03_nick', '', ['expires' => time() - 3600, 'path' => '/', 'httponly' => false, 'samesite' => 'Lax']);
    header('Location: index.php');
    exit;
}

$dbOk = data_db_ok();
$top = db_top_players(5);
$stats = db_stats();
$diagnoses = db_diagnoses();
$nick = current_nickname();
$encyclopedia = $nick !== null ? (require __DIR__ . '/includes/encyclopedia_data.php') : null;
$dashboard = null;
if ($nick !== null) {
    remember_nickname($nick);
    $player = db_find_player($nick);
    if ($player) $dashboard = db_player_dashboard((int) $player['player_id']);
}
$rank = (int) ($dashboard['rank'] ?? 0);
$backgroundTier = $rank >= 1 && $rank <= 3 ? $rank : 4;
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Смена 03 — учебный симулятор фельдшера</title>
  <meta name="description" content="Учебный симулятор ночной смены, операций и развития больницы.">
  <link rel="preload" as="image" href="assets/img/fon_main.webp" type="image/webp">
  <link rel="stylesheet" href="assets/css/main.css?v=3.1">
  <link rel="stylesheet" href="assets/css/cabinet.css?v=3.0">
  <link rel="stylesheet" href="assets/css/pixel-theme.css?v=3.0">
  <link rel="stylesheet" href="assets/css/readability.css?v=3.0">
  <link rel="stylesheet" href="assets/css/cabinet-pixel.css?v=3.3">
</head>
<body class="landing" data-db="<?= $dbOk ? '1' : '0' ?>" data-rank="<?= $rank ?: '' ?>">
<svg class="sprite" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor"/></symbol>
  <symbol id="i-book" viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 7.5h7M8 11h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7.6V12l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-pulse" viewBox="0 0 24 24"><path d="M2.5 12.5h4l2-4.5 3.2 8.5 2.6-6 1.7 2h5.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-flag" viewBox="0 0 24 24"><path d="M6 3v18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M6 4.2h11.5l-2.4 3.9 2.4 3.9H6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></symbol>
  <symbol id="i-trophy" viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 5.5H5.5v2A3.5 3.5 0 0 0 9 11M16 5.5h2.5v2A3.5 3.5 0 0 1 15 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 13v4M8.5 20h7M10 17h4l1 3H9l1-3Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
</svg>

<div class="stage">
  <div class="stage__bg stage__bg--rank-<?= $backgroundTier ?>" role="img" aria-label="Учебная больница ночной смены"></div>
  <div class="stage__vignette"></div><div class="stage__lamp"></div><div class="stage__grain"></div>
  <div class="wrap">
    <header class="topbar">
      <a class="brand" href="index.php" aria-label="Смена 03 — на главную"><span class="brand__mark">03</span><span class="brand__text"><span class="brand__name">Смена <b>03</b></span><span class="brand__tag">учебная скорая помощь</span></span></a>
      <nav class="topbar__nav" aria-label="Основная навигация">
        <a class="topbar__link" href="#cabinet">Личный кабинет</a>
        <a class="topbar__link" href="#top">Рекорды</a>
        <a class="topbar__link" href="rules.php">Правила</a>
        <span class="dbpill<?= $dbOk ? '' : ' is-off' ?>"><span class="dbpill__dot" aria-hidden="true"></span><?= $dbOk ? 'БД подключена' : 'БД offline' ?></span>
      </nav>
    </header>

    <main class="stage__main">
      <section class="menu" aria-labelledby="game-title">
        <p class="menu__kicker"><b>Ночная смена</b> · клинический тренажёр</p>
        <h1 class="menu__title" id="game-title">Смена <span>03</span></h1>
        <p class="menu__lead">Прими пациентов, поставь <b>диагноз</b>, собери порядок лечения и развивай учебную больницу. Ник вводится один раз — на этой странице.</p>
        <ol class="flow" aria-label="Как проходит приём"><li class="flow__step"><i>01</i> Осмотр</li><li class="flow__arrow" aria-hidden="true">→</li><li class="flow__step"><i>02</i> Диагноз</li><li class="flow__arrow" aria-hidden="true">→</li><li class="flow__step"><i>03</i> Лечение</li><li class="flow__arrow" aria-hidden="true">→</li><li class="flow__step"><i>04</i> Отчёт</li></ol>
        <div class="menu__actions">
          <?php if ($nick !== null): ?>
            <a class="btn-play" href="game.php?nick=<?= urlencode($nick) ?>"><span class="btn-play__icon" aria-hidden="true"><svg class="ico ico--play"><use href="#i-play"/></svg></span><span class="btn-play__text">Начать смену<span class="btn-play__hint">Результат пополнит прогресс кабинета</span></span></a>
          <?php else: ?>
            <a class="btn-play" href="#cabinet"><span class="btn-play__icon" aria-hidden="true"><svg class="ico ico--play"><use href="#i-play"/></svg></span><span class="btn-play__text">Открыть личный кабинет<span class="btn-play__hint">Сначала введи ник внизу</span></span></a>
          <?php endif; ?>
          <a class="btn-ghost" href="rules.php"><svg class="ico" aria-hidden="true"><use href="#i-book"/></svg> Правила и прогрессия</a>
        </div>
        <div class="menu__meta"><span class="chip"><svg class="ico" aria-hidden="true"><use href="#i-clock"/></svg> Смена <b>05:00</b></span><span class="chip"><svg class="ico" aria-hidden="true"><use href="#i-pulse"/></svg> Диагнозов в базе <b><?= count($diagnoses) ?></b></span><span class="chip<?= $stats['shifts'] === 0 ? ' is-empty' : '' ?>"><svg class="ico" aria-hidden="true"><use href="#i-flag"/></svg> Смен сдано <b><?= num_ru($stats['shifts']) ?></b></span></div>
      </section>

      <aside class="board" id="top" aria-labelledby="board-title">
        <div class="board__head"><h2 class="board__title" id="board-title">Топ смен</h2><span class="board__live"><i aria-hidden="true"></i> live</span></div>
        <?php if (empty($top)): ?>
          <div class="board__empty"><svg class="board__empty-ico" aria-hidden="true"><use href="#i-trophy"/></svg>Пока никто не сдал смену.<br>Твой ник будет первым в таблице.</div>
        <?php else: ?>
          <ol class="board__list">
            <?php foreach ($top as $row): $rCls = 'rank' . ($row['rank'] <= 3 ? ' rank--' . $row['rank'] : ''); ?>
              <li class="<?= $rCls ?>"><span class="rank__medal" aria-hidden="true"><?= str_pad((string) $row['rank'], 2, '0', STR_PAD_LEFT) ?></span><span class="rank__who"><span class="rank__nick"><?= e($row['nickname']) ?></span><span class="rank__when"><?= e(fmt_shift_date($row['finished_at'])) ?></span></span><span class="rank__score"><?= num_ru($row['score']) ?><small>очк</small></span></li>
            <?php endforeach; ?>
          </ol>
        <?php endif; ?>
        <p class="board__rank-note">Фон больницы меняется только у мест 1–3. Места 4+ используют базовую подстанцию.</p>
      </aside>
    </main>

    <section class="cabinet" id="cabinet" aria-labelledby="cabinet-title">
      <?php if ($nick === null): ?>
        <div class="cabinet__login">
          <div><p class="cabinet__eyebrow">Профиль игрока</p><h2 id="cabinet-title">Введи ник на главной</h2><p>Он сохраняет статистику, открывает две игры и доступ к развитию больницы. Пароль не требуется.</p></div>
          <form id="cabinet-login-form" class="cabinet-login-form" novalidate autocomplete="off"><label for="cabinet-nick">Ник игрока</label><div class="cabinet-login-form__row"><input id="cabinet-nick" name="nickname" type="text" minlength="3" maxlength="16" placeholder="Например, Фельдшер03" autocomplete="nickname"><button class="btn-solid" type="submit">Войти в кабинет</button></div><small>3–16 символов: буквы, цифры, пробел, дефис, подчёркивание.</small><p class="cabinet__error" id="cabinet-login-error" hidden></p></form>
        </div>
      <?php else: ?>
        <div class="cabinet__head"><div><p class="cabinet__eyebrow">Личный кабинет · <?= e($nick) ?></p><h2 id="cabinet-title">Подстанция игрока</h2><p>Награды начисляются только за завершённые игры. Оборудование покупается здесь, а не во время смены.</p></div><div class="cabinet__head-actions"><button class="cabinet__switch encyclopedia-trigger" id="encyclopedia-open" type="button" aria-haspopup="dialog" aria-controls="encyclopedia-modal"><svg class="encyclopedia-trigger__icon" viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path d="M4 4h7v16H5V5zm9 0h7v16h-6V5z" fill="#7fd6b0"/><path d="M7 8h2v2H7zm0 4h2v2H7zm9-4h2v2h-2zm0 4h2v2h-2z" fill="#0b1719"/><path d="M11 4h2v17h-2z" fill="#f0a95c"/></svg>Энциклопедия <span class="encyclopedia-trigger__count">12 / 4</span></button><a class="cabinet__switch" href="index.php?logout=1">Сменить ник</a></div></div>
        <div id="cabinet-content" aria-live="polite"></div>
      <?php endif; ?>
    </section>

    <?php if ($nick !== null): ?>
    <div class="encyclopedia-modal" id="encyclopedia-modal" hidden>
      <section class="encyclopedia-window" role="dialog" aria-modal="true" aria-labelledby="encyclopedia-title" aria-describedby="encyclopedia-description" tabindex="-1">
        <header class="encyclopedia-window__head">
          <div><p class="encyclopedia-kicker">Архив учебной подстанции · открыто для изучения</p><h2 id="encyclopedia-title">Медицинская энциклопедия</h2><p id="encyclopedia-description">Краткие справки по всем диагнозам и операциям тренажёра. Материалы не заменяют медицинскую помощь и клинические протоколы.</p></div>
          <button class="encyclopedia-close" id="encyclopedia-close" type="button" aria-label="Закрыть энциклопедию">×</button>
        </header>
        <div class="encyclopedia-toolbar">
          <div class="encyclopedia-tabs" role="tablist" aria-label="Разделы энциклопедии">
            <button class="encyclopedia-tab is-active" id="encyclopedia-tab-diagnoses" type="button" role="tab" aria-selected="true" aria-controls="encyclopedia-grid" data-encyclopedia-tab="diagnoses">Диагнозы <span>12</span></button>
            <button class="encyclopedia-tab" id="encyclopedia-tab-operations" type="button" role="tab" aria-selected="false" aria-controls="encyclopedia-grid" data-encyclopedia-tab="operations" tabindex="-1">Операции <span>4</span></button>
          </div>
          <label class="encyclopedia-search"><span>Поиск по справочнику</span><input id="encyclopedia-search" type="search" placeholder="Название, симптомы или тема…" autocomplete="off"></label>
        </div>
        <div class="encyclopedia-status"><p id="encyclopedia-results" aria-live="polite">12 статей</p><div class="encyclopedia-progress"><span id="encyclopedia-progress-label">Просмотрено: 0 из 16</span><span class="encyclopedia-progress__track"><i id="encyclopedia-progress-bar"></i></span></div><p class="encyclopedia-open-note">Все статьи доступны сразу — отметка показывает только твой прогресс чтения.</p></div>
        <div class="encyclopedia-grid" id="encyclopedia-grid" role="tabpanel" aria-labelledby="encyclopedia-tab-diagnoses" tabindex="0"></div>
        <p class="encyclopedia-empty" id="encyclopedia-empty" hidden>По этому запросу ничего не найдено.</p>
        <footer class="encyclopedia-window__foot"><span>Смена 03 · справочник симулятора</span><span>При опасных симптомах обращайся за экстренной помощью</span></footer>
      </section>
    </div>
    <?php endif; ?>

    <section class="stats" aria-label="Статистика по базе"><div class="wrap"><div class="stats__grid"><div class="stat"><span class="stat__label">Игроков</span><span class="stat__value"><?= num_ru($stats['players']) ?></span></div><div class="stat"><span class="stat__label">Смен сдано</span><span class="stat__value"><?= num_ru($stats['shifts']) ?></span></div><div class="stat"><span class="stat__label">Рекорд</span><span class="stat__value"><?= $stats['best'] > 0 ? num_ru($stats['best']) : '—' ?><small><?= $stats['best'] > 0 ? 'очк' : '' ?></small></span></div><div class="stat"><span class="stat__label">Средний счёт</span><span class="stat__value"><?= $stats['avg'] > 0 ? num_ru($stats['avg']) : '—' ?></span></div></div></div></section>
    <footer class="foot wrap"><span>Смена 03 · учебный симулятор профессии</span><span class="foot__links"><a href="rules.php">Правила</a><a href="#cabinet">Личный кабинет</a><a href="#top">Топ смен</a></span><span>Без графических сцен · только учебные сценарии</span></footer>
  </div>
</div>
<script>window.CABINET = <?= json_encode(['nick' => $nick, 'dashboard' => $dashboard, 'equipment' => progression_equipment(), 'hospitalLevels' => progression_hospital_levels(), 'encyclopedia' => $encyclopedia], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
<script src="assets/js/cabinet.js?v=3.4"></script>
</body></html>
