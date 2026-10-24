<?php
/**
 * game.php — игровой экран «Смена 03».
 *
 * Одна смена целиком: таймер, пациенты, диагноз, лечение в правильном
 * порядке, звонки диспетчера, финал с отправкой результата в БД.
 *
 * Контент и баланс приходят из patient_data.php (сервер), логика — в
 * assets/js/shift.js. Страница работает и без ника (гостевой режим),
 * но тогда результат не попадает в топ.
 */

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/patient_data.php';

$nick = current_nickname();
if ($nick !== null) {
    remember_nickname($nick);
}

$players   = game_patients();
$dispatches = shift_dispatches();
$config    = shift_config();

$save = null;
if ($nick !== null) {
    $player = db_find_player($nick);
    if ($player) {
        $save = db_load_save((int) $player['player_id']);
    }
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Смена — Смена 03</title>
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/game.css">
</head>
<body class="game-body">

<svg class="sprite" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <symbol id="i-pause" viewBox="0 0 24 24"><rect x="7" y="5" width="3.6" height="14" rx="1" fill="currentColor"/><rect x="13.4" y="5" width="3.6" height="14" rx="1" fill="currentColor"/></symbol>
  <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></symbol>
  <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20s-7-4.6-7-9.3A4 4 0 0 1 12 7.6 4 4 0 0 1 19 10.7C19 15.4 12 20 12 20Z" fill="currentColor"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
</svg>

<!-- ===================== HUD ===================== -->
<header class="hud" id="hud">
  <div class="hud__left">
    <a class="hud__brand" href="index.php" title="Выйти в меню">
      <span class="hud__mark">03</span>
      <span class="hud__nick" id="hud-nick">Гость</span>
    </a>
  </div>

  <div class="hud__stats">
    <div class="hud__cell">
      <span class="hud__label">Смена</span>
      <span class="hud__value" id="hud-timer">05:00</span>
    </div>
    <div class="hud__cell">
      <span class="hud__label">Пациент</span>
      <span class="hud__value" id="hud-progress">1/8</span>
    </div>
    <div class="hud__cell">
      <span class="hud__label">Счёт</span>
      <span class="hud__value hud__value--lamp" id="hud-score">0</span>
    </div>
    <div class="hud__cell hud__cell--rep">
      <span class="hud__label">Репутация</span>
      <span class="hud__value" id="hud-rep">100</span>
      <span class="rep-bar"><i id="rep-fill" style="width:100%"></i></span>
    </div>
  </div>

  <div class="hud__right">
    <button class="hud__btn" id="btn-pause" type="button" title="Пауза (P)">
      <svg class="ico" aria-hidden="true"><use href="#i-pause"/></svg>
    </button>
  </div>
</header>

<main class="lay">

  <!-- ===================== ЭКРАН ПАЦИЕНТА ===================== -->
  <section class="screen" id="screen-patient" aria-live="polite">

    <aside class="pcard">
      <div class="pcard__top">
        <div class="pcard__avatar" id="p-avatar">🧑</div>
        <div class="pcard__id">
          <span class="pcard__case" id="p-case">Приём 01</span>
          <h2 class="pcard__name" id="p-name">—</h2>
          <p class="pcard__age" id="p-age">—</p>
        </div>
      </div>

      <div class="pcard__block">
        <h3 class="pcard__h">Жалобы</h3>
        <div class="symptoms" id="p-symptoms"></div>
      </div>

      <div class="pcard__block">
        <h3 class="pcard__h">Показатели</h3>
        <div class="vitals" id="p-vitals"></div>
      </div>
    </aside>

    <section class="work" id="work">
      <!-- шаг 1: диагноз -->
      <div class="work__step" id="step-diag">
        <div class="work__head">
          <h2 class="work__title">Поставь диагноз</h2>
          <p class="work__sub">Один из трёх. Ошибка снимет очки и репутацию.</p>
        </div>
        <div class="diag-grid" id="diag-grid"></div>
        <p class="hint" id="diag-hint"></p>
      </div>

      <!-- шаг 2: лечение -->
      <div class="work__step hidden" id="step-treat">
        <div class="work__head">
          <h2 class="work__title">Лечение по порядку</h2>
          <p class="work__sub">Нажимай действия в правильной последовательности. Неверный шаг бьёт по репутации.</p>
        </div>
        <div class="treat" id="treat-pool"></div>
        <div class="treat-seq" id="treat-seq"></div>
        <p class="hint" id="treat-hint"></p>
      </div>
    </section>
  </section>

  <!-- ===================== ЗВОНОК ДИСПЕТЧЕРА ===================== -->
  <section class="screen hidden" id="screen-call">
    <div class="call">
      <div class="call__head">
        <span class="call__pulse" aria-hidden="true"></span>
        <span class="call__label" id="call-title">Звонок диспетчера</span>
      </div>
      <p class="call__text" id="call-text">—</p>
      <div class="call__options" id="call-options"></div>
    </div>
  </section>

  <!-- ===================== ОБРАТНАЯ СВЯЗЬ ===================== -->
  <div class="toast" id="toast" hidden></div>

  <!-- ===================== ПАУЗА ===================== -->
  <div class="modal" id="modal-pause" hidden>
    <div class="modal__card">
      <h2 class="modal__title">Пауза</h2>
      <p class="modal__sub">Смена сохранена. Таймер остановлен.</p>
      <div class="modal__stats" id="pause-stats"></div>
      <div class="modal__actions">
        <button class="btn btn-primary btn-lg" id="btn-resume" type="button">Продолжить</button>
        <button class="btn btn-ghost" id="btn-quit" type="button">Завершить смену</button>
      </div>
      <p class="modal__note" id="pause-save"></p>
    </div>
  </div>

  <!-- ===================== ФИНАЛ ===================== -->
  <div class="modal" id="modal-final" hidden>
    <div class="modal__card modal__card--final">
      <span class="final__badge" id="final-badge">Смена сдана</span>
      <h2 class="final__title" id="final-title">Смена сдана</h2>
      <p class="final__sub" id="final-sub">—</p>

      <div class="final__score">
        <span class="final__score-label">Итоговый счёт</span>
        <span class="final__score-value" id="final-score">0</span>
      </div>

      <div class="final__grid">
        <div class="final__cell"><span>Спасено</span><b id="final-saved">0</b></div>
        <div class="final__cell"><span>Точность</span><b id="final-acc">0%</b></div>
        <div class="final__cell"><span>Репутация</span><b id="final-rep">0</b></div>
        <div class="final__cell"><span>Место в топе</span><b id="final-rank">—</b></div>
      </div>

      <p class="final__save" id="final-save"></p>

      <div class="modal__actions">
        <a class="btn btn-primary btn-lg" href="game.php<?= $nick !== null ? '?nick=' . urlencode($nick) : '' ?>">Ещё смена</a>
        <a class="btn btn-ghost" href="index.php">В меню</a>
        <a class="btn btn-ghost" href="rules.php">Правила</a>
      </div>
    </div>
  </div>

</main>

<script>
window.SHIFT = <?= json_encode([
    'nick'       => $nick,
    'patients'   => $players,
    'dispatches' => $dispatches,
    'config'     => $config,
    'save'       => $save,
    'dbOk'       => data_db_ok(),
    'endpoints'  => [
        'save'  => 'api/save.php',
        'score' => 'api/score.php',
    ],
], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
</script>
<script src="assets/js/shift.js"></script>
</body>
</html>
