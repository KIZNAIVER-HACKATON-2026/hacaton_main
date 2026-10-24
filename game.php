<?php
/**
 * game.php — игровой экран «Смена 03».
 *
 * Одна смена целиком: таймер, пациенты, диагноз, лечение в правильном
 * порядке, звонки диспетчера, финал с отправкой результата в БД.
 *
 * Контент и баланс приходят из patient_data.php (сервер), логика — в
 * assets/js/shift.js. Вход выполняется только через личный кабинет на
 * главной странице: ник уже сохранён до старта смены.
 */

require_once __DIR__ . '/includes/bootstrap.php';
require_once __DIR__ . '/patient_data.php';

$nick = current_nickname();
if ($nick === null) {
    header('Location: index.php#cabinet');
    exit;
}
remember_nickname($nick);

$players   = game_patients();
$dispatches = shift_dispatches();
$config    = shift_config();

$save = null;
$storyProgress = [
    'shifts_finished' => 0,
    'operations_finished' => 0,
    'operations_success' => 0,
    'hospital_level' => 0,
];
$player = db_find_player($nick);
if ($player) {
    $save = db_load_save((int) $player['player_id']);
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
  <title>Смена — Смена 03</title>
  <link rel="stylesheet" href="assets/css/base.css?v=2.2">
  <link rel="stylesheet" href="assets/css/game.css?v=2.3">
  <link rel="stylesheet" href="assets/css/pixel-theme.css?v=2.2">
  <link rel="stylesheet" href="assets/css/pixel-window.css?v=2.2">
  <link rel="stylesheet" href="assets/css/readability.css?v=2.2">
  <link rel="stylesheet" href="assets/css/story-dialogue.css?v=1.0">
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
    <a class="hud__btn hud__btn--cabinet" href="index.php" title="Вернуться в личный кабинет">Кабинет</a>
    <button class="hud__btn" id="btn-pause" type="button" title="Пауза (P)">
      <svg class="ico" aria-hidden="true"><use href="#i-pause"/></svg>
    </button>
  </div>
</header>

<main class="lay">

  <!-- ===================== ЭКРАН ПАЦИЕНТА ===================== -->
  <section class="screen" id="screen-patient" aria-live="polite">

    <aside class="pcard pixel-dossier theme-night" id="patient-dossier" data-theme="night">
      <div class="pixel-dossier__toolbar">
        <span class="pixel-dossier__case-tag" id="p-case">Приём 01</span>
        <div class="pixel-dossier__palette-switch" role="group" aria-label="Палитра окна">
          <button type="button" class="pixel-palette-btn is-active" data-set-theme="night" title="Ночная смена (под фон сайта)">🚑 Ночь</button>
          <button type="button" class="pixel-palette-btn" data-set-theme="classic" title="Классика (из референса)">📋 Макет</button>
          <button type="button" class="pixel-palette-btn" data-set-theme="paper" title="Медицинский бланк">🩺 Бланк</button>
        </div>
      </div>

      <div class="pixel-dossier__shell">
        <div class="pixel-dossier__grid">

          <!-- ЛЕВАЯ КОЛОНКА: ЗАКЛЮЧЕНИЕ + ЛИНИИ -->
          <div class="pixel-dossier__left">
            <div class="pixel-badge">«Заключение»</div>

            <div class="pixel-ruled-sheet">
              <div class="pixel-ruled-row pixel-ruled-row--title">Жалобы:</div>
              <div id="p-symptoms" class="pixel-symptoms-container"></div>

              <div class="pixel-ruled-row pixel-ruled-row--title">Показатели:</div>
              <div id="p-vitals" class="pixel-vitals-container"></div>

              <div class="pixel-ruled-row pixel-ruled-row--empty"></div>
              <div class="pixel-ruled-row pixel-ruled-row--empty"></div>
            </div>
          </div>

          <!-- ЦЕНТРАЛЬНЫЙ РАЗДЕЛИТЕЛЬ -->
          <div class="pixel-divider-bar" aria-hidden="true"></div>

          <!-- ПРАВАЯ КОЛОНКА: ФОТО + ФИО -->
          <div class="pixel-dossier__right">
            <div class="pixel-photo-frame">
              <div class="pixel-photo-frame__avatar-wrap" id="p-avatar-wrap">
                <span class="pixel-photo-frame__avatar" id="p-avatar">🧑</span>
              </div>
              <div class="pixel-photo-frame__pulse">
                <span class="pixel-pulse-dot" aria-hidden="true"></span>
                <span id="p-status">Осмотр</span>
              </div>
            </div>

            <div class="pixel-fio-section">
              <div class="pixel-fio-row">
                <span class="pixel-fio-label">Ф.И.О.</span>
                <div class="pixel-fio-underline">
                  <span class="pixel-fio-value" id="p-name">—</span>
                </div>
              </div>
              <div class="pixel-age-line" id="p-age">—</div>
            </div>
          </div>

        </div>
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
      <div class="call__dialogue-row">
        <div class="call__avatar" id="call-avatar" aria-hidden="true"></div>
        <div class="call__copy"><p class="call__speaker" id="call-speaker">Вера · диспетчер</p><p class="call__text" id="call-text">—</p></div>
      </div>
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
    'storyProgress' => $storyProgress,
    'dbOk'       => data_db_ok(),
    'endpoints'  => [
        'save'  => 'api/save.php',
        'score' => 'api/score.php',
    ],
], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
</script>
<script src="assets/js/pixel-art.js?v=2.3"></script>
<script src="assets/js/story-dialogue.js?v=1.0"></script>
<script src="assets/js/shift.js?v=3.2"></script>
</body>
</html>
