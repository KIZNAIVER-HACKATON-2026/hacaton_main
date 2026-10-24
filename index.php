<?php
/**
 * index.php — главное меню «Смена 03».
 *
 * Все данные на странице приходят из MySQL через includes/data.php:
 *   — топ-5 игроков      (db_top_players)
 *   — сводка по базе     (db_stats)
 *   — последние смены    (db_recent_runs)
 *   — справочник диагнозов (db_diagnoses)
 *
 * Если база недоступна, страница не падает: блоки показывают заглушки,
 * а индикатор в шапке переключается в состояние «нет связи».
 */

require_once __DIR__ . '/includes/data.php';
require_once __DIR__ . '/includes/format.php';

$dbOk     = data_db_ok();
$top      = db_top_players(5);
$stats    = db_stats();
$recent   = db_recent_runs(3);
$diagnoses = db_diagnoses();

$shiftMinutes = 5;
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Смена 03 — симулятор дежурства фельдшера</title>
  <meta name="description" content="Одна ночь на подстанции скорой. Принимай пациентов, ставь диагнозы и держи репутацию — пока не кончится смена.">

  <link rel="preload" as="image" href="assets/img/fon_main.webp" type="image/webp">
  <link rel="stylesheet" href="assets/css/main.css">
</head>
<body class="landing" data-db="<?= $dbOk ? '1' : '0' ?>">

<!-- спрайт иконок: без внешних шрифтов и эмодзи -->
<svg class="sprite" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor"/></symbol>
  <symbol id="i-book" viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 7.5h7M8 11h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7.6V12l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-pulse" viewBox="0 0 24 24"><path d="M2.5 12.5h4l2-4.5 3.2 8.5 2.6-6 1.7 2h5.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-flag" viewBox="0 0 24 24"><path d="M6 3v18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M6 4.2h11.5l-2.4 3.9 2.4 3.9H6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></symbol>
  <symbol id="i-trophy" viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 5.5H5.5v2A3.5 3.5 0 0 0 9 11M16 5.5h2.5v2A3.5 3.5 0 0 1 15 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 13v4M8.5 20h7M10 17h4l1 3H9l1-3Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-save" viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5V4Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.5 4v5h7V4M8.5 20v-6h7v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
  <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
</svg>

<!-- сцена -->
<div class="stage">
  <div class="stage__bg" role="img" aria-label="Ночная подстанция скорой помощи: приглушённый свет, зелёные стены"></div>
  <div class="stage__vignette"></div>
  <div class="stage__lamp"></div>
  <div class="stage__grain"></div>

  <div class="wrap">

    <!-- ===================== ШАПКА ===================== -->
    <header class="topbar">
      <a class="brand" href="index.php" aria-label="Смена 03 — на главную">
        <span class="brand__mark" aria-hidden="true">03</span>
        <span class="brand__text">
          <span class="brand__name">Смена <b>03</b></span>
          <span class="brand__tag">скорая помощь</span>
        </span>
      </a>

      <nav class="topbar__nav" aria-label="Основная навигация">
        <a class="topbar__link" href="#top">Рекорды</a>
        <a class="topbar__link" href="rules.php">Правила</a>
        <span class="dbpill<?= $dbOk ? '' : ' is-off' ?>" title="<?= $dbOk ? 'Данные загружаются из MySQL' : 'База недоступна: показаны заглушки' ?>">
          <span class="dbpill__dot" aria-hidden="true"></span>
          <?= $dbOk ? 'БД подключена' : 'БД offline' ?>
        </span>
      </nav>
    </header>

    <!-- ===================== МЕНЮ + ТАБЛО ===================== -->
    <main class="stage__main">

      <section class="menu" aria-labelledby="game-title">
        <p class="menu__kicker"><b>Ночная смена</b> · 03:00 — 03:05</p>

        <h1 class="menu__title" id="game-title">Смена <span>03</span></h1>

        <p class="menu__lead">
          Одна ночь на подстанции скорой. Принимай пациентов, ставь
          <b>диагнозы</b> и собирай порядок лечения — пока не кончилось
          дежурство и не упала репутация.
        </p>

        <ol class="flow" aria-label="Как проходит приём">
          <li class="flow__step"><i>01</i> Осмотр</li>
          <li class="flow__arrow" aria-hidden="true">→</li>
          <li class="flow__step"><i>02</i> Диагноз</li>
          <li class="flow__arrow" aria-hidden="true">→</li>
          <li class="flow__step"><i>03</i> Лечение</li>
          <li class="flow__arrow" aria-hidden="true">→</li>
          <li class="flow__step"><i>04</i> Отчёт</li>
        </ol>

        <div class="menu__actions">
          <button class="btn-play" id="btn-play" type="button">
            <span class="btn-play__icon" aria-hidden="true"><svg class="ico ico--play"><use href="#i-play"/></svg></span>
            <span class="btn-play__text">
              Начать смену
              <span class="btn-play__hint">3–16 символов в нике · Enter</span>
            </span>
          </button>
          <a class="btn-ghost" href="game.php"><svg class="ico" aria-hidden="true"><use href="#i-book"/></svg> Как играть</a>
        </div>

        <div class="menu__meta">
          <span class="chip"><svg class="ico" aria-hidden="true"><use href="#i-clock"/></svg> Смена <b><?= $shiftMinutes ?>:00</b></span>
          <span class="chip"><svg class="ico" aria-hidden="true"><use href="#i-pulse"/></svg> Диагнозов в базе <b><?= count($diagnoses) ?></b></span>
          <span class="chip<?= $stats['shifts'] === 0 ? ' is-empty' : '' ?>">
            <svg class="ico" aria-hidden="true"><use href="#i-flag"/></svg> Смен сдано <b><?= num_ru($stats['shifts']) ?></b>
          </span>
        </div>
      </section>

      <!-- ===================== ТОП-5 ИЗ БД ===================== -->
      <aside class="board" id="top" aria-labelledby="board-title">
        <div class="board__head">
          <h2 class="board__title" id="board-title">Топ смен</h2>
          <span class="board__live"><i aria-hidden="true"></i> live · MySQL</span>
        </div>

        <?php if (empty($top)): ?>
          <div class="board__empty">
            <svg class="board__empty-ico" aria-hidden="true"><use href="#i-trophy"/></svg>
            <?= $dbOk
                ? 'Пока никто не сдал смену.<br>Твой ник будет первым в таблице.'
                : 'Нет связи с базой.<br>Сыграй — рекорд уйдёт в топ, как только база поднимется.' ?>
          </div>
        <?php else: ?>
          <ol class="board__list">
            <?php foreach ($top as $row): ?>
              <li class="rank<?= $row['rank'] === 1 ? ' rank--1' : '' ?>">
                <span class="rank__medal" aria-hidden="true"><?= str_pad((string) $row['rank'], 2, '0', STR_PAD_LEFT) ?></span>
                <span class="rank__who">
                  <span class="rank__nick"><?= e($row['nickname']) ?></span>
                  <span class="rank__when"><?= e(fmt_shift_date($row['finished_at'])) ?></span>
                </span>
                <span class="rank__score"><?= num_ru($row['score']) ?><small>очк</small></span>
              </li>
            <?php endforeach; ?>
          </ol>
        <?php endif; ?>

        <?php if (!empty($recent)): ?>
          <div class="board__foot">
            <p class="board__foot-title">Последние смены</p>
            <div class="recent">
              <?php foreach ($recent as $run): ?>
                <div class="recent__row">
                  <span class="recent__nick"><?= e($run['nickname']) ?></span>
                  <span class="recent__dot" aria-hidden="true">·</span>
                  <span class="recent__when"><?= e(fmt_ago($run['finished_at'])) ?></span>
                  <span class="recent__score"><?= num_ru($run['score']) ?></span>
                </div>
              <?php endforeach; ?>
            </div>
          </div>
        <?php endif; ?>
      </aside>

    </main>

    <!-- ===================== СВОДКА ===================== -->
    <section class="stats" aria-label="Статистика по базе">
      <div class="wrap">
        <div class="stats__grid">
          <div class="stat">
            <span class="stat__label">Игроков</span>
            <span class="stat__value"><?= num_ru($stats['players']) ?></span>
          </div>
          <div class="stat">
            <span class="stat__label">Смен сдано</span>
            <span class="stat__value"><?= num_ru($stats['shifts']) ?></span>
          </div>
          <div class="stat">
            <span class="stat__label">Рекорд</span>
            <span class="stat__value"><?= $stats['best'] > 0 ? num_ru($stats['best']) : '—' ?><small><?= $stats['best'] > 0 ? 'очк' : '' ?></small></span>
          </div>
          <div class="stat">
            <span class="stat__label">Средний счёт</span>
            <span class="stat__value"><?= $stats['avg'] > 0 ? num_ru($stats['avg']) : '—' ?></span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================== ПОДВАЛ ===================== -->
    <footer class="foot wrap">
      <span>Смена 03 · учебный симулятор профессии · фельдшер скорой помощи</span>
      <span class="foot__links">
        <a href="rules.php">Правила</a>
        <a href="game.php">Играть</a>
        <a href="#top">Топ смен</a>
      </span>
      <span><kbd>Esc</kbd> закрыть · <kbd>Enter</kbd> начать</span>
    </footer>

  </div>
</div>

<!-- ===================== МОДАЛКА: НИК / ПРОДОЛЖИТЬ ===================== -->
<div class="modal" id="start-modal" hidden role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <div class="modal__card" role="document">
    <div class="modal__eyebrow">
      <span>Смена 03 · вход</span>
      <button class="modal__close" id="modal-close" type="button" aria-label="Закрыть">✕</button>
    </div>

    <h2 class="modal__title" id="modal-title">Как тебя зовут?</h2>
    <p class="modal__sub">Ник нужен для сохранения смены и участия в топе. Регистрация не требуется.</p>

    <form id="nick-form" autocomplete="off" novalidate>
      <label class="field">
        <span class="field__label">Ник игрока</span>
        <input class="input" type="text" id="nick-input" name="nickname"
               maxlength="16" minlength="3" placeholder="Например, Фельдшер01"
               autocomplete="nickname" spellcheck="false" aria-describedby="nick-hint nick-error">
        <span class="field__hint" id="nick-hint">
          <span>3–16 символов · только ник, без пароля</span>
          <span class="field__count" id="nick-count">0/16</span>
        </span>
      </label>

      <p class="error" id="nick-error" role="alert" hidden></p>

      <!-- сюда JS подставит найденное сохранение -->
      <div class="resume" id="resume-panel" hidden>
        <div class="resume__head">
          <svg class="ico ico--sm" aria-hidden="true"><use href="#i-save"/></svg> Найдено сохранение
        </div>
        <div class="resume__grid">
          <div class="resume__cell"><span>Очки</span><b id="resume-score">—</b></div>
          <div class="resume__cell"><span>Репутация</span><b id="resume-rep">—</b></div>
          <div class="resume__cell"><span>Осталось</span><b id="resume-time">—</b></div>
        </div>
        <p class="resume__note">Можно продолжить с места остановки или начать новую смену.</p>
      </div>

      <div class="modal__actions">
        <button class="btn-solid" id="btn-start" type="submit">
          <span id="btn-start-label">Начать смену</span> <svg class="ico ico--sm" aria-hidden="true"><use href="#i-arrow"/></svg>
        </button>
        <button class="btn-flat" id="btn-cancel" type="button">Отмена</button>
      </div>
    </form>
  </div>
</div>

<script src="assets/js/main.js"></script>
</body>
</html>
