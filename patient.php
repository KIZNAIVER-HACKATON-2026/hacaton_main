<?php
// patient.php — карточка пациента.
// Принимает ник из главного меню: patient.php?nick=...&resume=1
// Если по нику есть сохранение — показывает, с какого пациента продолжать.
require_once __DIR__ . '/includes/bootstrap.php';

// ник пришёл с главной — запоминаем и работаем от него
$nick = current_nickname();
if ($nick !== null) {
    remember_nickname($nick);
}

$resume = isset($_GET['resume']) && $_GET['resume'] === '1';
$saved  = null;
if ($nick !== null) {
    $player = db_find_player($nick);
    if ($player) {
        $saved = db_load_save((int) $player['player_id']);
    }
}

// Сохранение важнее параметра id: продолжаем с того же пациента
$resumeId = null;
if ($saved && isset($saved['state']['patientIndex'])) {
    $resumeId = (int) $saved['state']['patientIndex'] + 1;
}

require_once __DIR__ . '/patient_data.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
if ($id === null && $resumeId !== null) {
    $id = $resumeId; // продолжаем смену с сохранённого пациента
}
$patient = getPatient($id);
$nickParam = $nick !== null ? 'nick=' . urlencode($nick) : '';
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#070a0e">
  <title>Карточка пациента — Смена 03</title>
  <link rel="stylesheet" href="assets/css/base.css?v=2.2">
  <link rel="stylesheet" href="assets/css/style.css?v=2.2">
  <link rel="stylesheet" href="assets/css/pixel-theme.css?v=2.2">
  <link rel="stylesheet" href="assets/css/pixel-window.css?v=2.2">
  <link rel="stylesheet" href="assets/css/readability.css?v=2.2">
  <link rel="stylesheet" href="assets/css/mobile.css?v=1.0">
</head>
<body>

<main class="patient-page">

  <nav class="rules-nav">
    <a href="index.php" class="btn btn-ghost">← В меню</a>
    <span class="player-tag">
      <?php if ($nick !== null): ?>
        Смена игрока <b><?= e($nick) ?></b>
      <?php else: ?>
        Гостевой режим
      <?php endif; ?>
    </span>
    <a href="rules.php" class="btn btn-ghost">📖 Правила</a>
  </nav>

  <?php if ($resume && $saved): ?>
    <div class="player-tag player-tag--wide">
      Продолжаем сохранённую смену: <b><?= num_ru((int)($saved['state']['score'] ?? 0)) ?></b> очков ·
      репутация <b><?= (int)($saved['state']['reputation'] ?? 100) ?></b> ·
      пауза с <?= e(fmt_shift_date($saved['saved_at'])) ?>
    </div>
  <?php endif; ?>

  <div class="patient-dossier-wrap" style="max-width: 610px; margin: 20px auto;">
    <aside class="pcard pixel-dossier theme-night" id="patient-dossier" data-theme="night">
      <div class="pixel-dossier__toolbar">
        <span class="pixel-dossier__case-tag">Карта №<?= (int)$patient['id'] ?> · Осмотр</span>
        <div class="pixel-dossier__palette-switch" role="group" aria-label="Палитра окна">
          <button type="button" class="pixel-palette-btn is-active" data-set-theme="night" title="Ночная смена (под сайт)">🚑 Ночь</button>
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
              <?php foreach ($patient['symptoms'] as $s): ?>
                <div class="pixel-ruled-row">
                  <span class="pixel-bullet">▪</span>
                  <span class="pixel-symptom-text"><?= htmlspecialchars($s) ?></span>
                </div>
              <?php endforeach; ?>

              <div class="pixel-ruled-row pixel-ruled-row--title">Показатели:</div>
              <div class="pixel-ruled-row">
                <div class="pixel-vitals-row">
                  <span class="pixel-vital-cell"><span class="pixel-vital-label">АД:</span> <span class="pixel-vital-value"><?= htmlspecialchars($patient['vitals']['ad'] ?? '—') ?></span></span>
                  <span class="pixel-vital-cell"><span class="pixel-vital-label">Пульс:</span> <span class="pixel-vital-value"><?= htmlspecialchars($patient['vitals']['pulse'] ?? '—') ?></span></span>
                </div>
              </div>
              <div class="pixel-ruled-row">
                <div class="pixel-vitals-row">
                  <span class="pixel-vital-cell"><span class="pixel-vital-label">Темп.:</span> <span class="pixel-vital-value"><?= htmlspecialchars($patient['vitals']['temp'] ?? '—') ?>°</span></span>
                  <span class="pixel-vital-cell"><span class="pixel-vital-label">SpO₂:</span> <span class="pixel-vital-value"><?= htmlspecialchars($patient['vitals']['spo2'] ?? '—') ?></span></span>
                </div>
              </div>

              <div class="pixel-ruled-row pixel-ruled-row--empty"></div>
              <div class="pixel-ruled-row pixel-ruled-row--empty"></div>
            </div>
          </div>

          <!-- ЦЕНТРАЛЬНЫЙ РАЗДЕЛИТЕЛЬ -->
          <div class="pixel-divider-bar" aria-hidden="true"></div>

          <!-- ПРАВАЯ КОЛОНКА: ФОТО + ФИО -->
          <div class="pixel-dossier__right">
            <div class="pixel-photo-frame">
              <div class="pixel-photo-frame__avatar-wrap" style="background: <?= htmlspecialchars($patient['avatarBg'] ?? 'rgba(127,214,176,0.15)') ?>">
                <?php if (!empty($patient['svg'])): ?>
                  <span class="pixel-photo-frame__avatar"><?= $patient['svg'] ?></span>
                <?php else: ?>
                  <span class="pixel-photo-frame__avatar"><?= htmlspecialchars($patient['emoji'] ?? '🧑') ?></span>
                <?php endif; ?>
              </div>
              <div class="pixel-photo-frame__pulse">
                <span class="pixel-pulse-dot" aria-hidden="true"></span>
                <span>Осмотр фельдшера</span>
              </div>
            </div>

            <div class="pixel-fio-section">
              <div class="pixel-fio-row">
                <span class="pixel-fio-label">Ф.И.О.</span>
                <div class="pixel-fio-underline">
                  <span class="pixel-fio-value"><?= htmlspecialchars($patient['fio']) ?></span>
                </div>
              </div>
              <div class="pixel-age-line">Возраст: <?= (int)$patient['age'] ?> <?= plural((int)$patient['age'], 'год', 'года', 'лет') ?></div>
            </div>
          </div>

        </div>
      </div>
    </aside>

    <!-- ПЕРЕЛИНКОВКА: кнопка «Начать лечение» → diagnosis.php?id=... -->
    <div class="patient-actions" style="margin-top: 24px; text-align: center;">
      <a href="diagnosis.php?id=<?= (int)$patient['id'] ?><?= $nickParam !== '' ? '&' . e($nickParam) : '' ?>"
         class="btn btn-primary btn-lg" style="width: 100%; max-width: 320px;">
        💊 Начать лечение
      </a>
    </div>
  </div>

</main>

<script>
(function() {
  var dossier = document.getElementById('patient-dossier');
  if (!dossier) return;
  var buttons = document.querySelectorAll('[data-set-theme]');
  var saved = 'night';
  try { saved = localStorage.getItem('shift_dossier_theme') || 'night'; } catch(e){}
  apply(saved);

  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var t = btn.getAttribute('data-set-theme');
      apply(t);
      try { localStorage.setItem('shift_dossier_theme', t); } catch(e){}
    });
  });

  function apply(t) {
    dossier.className = 'pcard pixel-dossier theme-' + t;
    dossier.setAttribute('data-theme', t);
    buttons.forEach(function(b) {
      b.classList.toggle('is-active', b.getAttribute('data-set-theme') === t);
    });
  }
})();
</script>

</body>
</html>