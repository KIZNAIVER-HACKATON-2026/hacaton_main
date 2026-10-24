<?php
// diagnosis.php — выбор одного из трёх диагнозов.
require_once __DIR__ . '/patient_data.php'; // выносим данные в общий файл (см. ниже)

$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$patient = getPatient($id);
$diagnoses = $patient['diagnoses'] ?? [];
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#070a0e">
  <title>Диагноз — Смена 03</title>
  <link rel="stylesheet" href="assets/css/base.css?v=2.2">
  <link rel="stylesheet" href="assets/css/style.css?v=2.2">
  <link rel="stylesheet" href="assets/css/pixel-theme.css?v=2.2">
  <link rel="stylesheet" href="assets/css/readability.css?v=2.2">
  <link rel="stylesheet" href="assets/css/mobile.css?v=1.0">
</head>
<body>

<main class="patient-page">

  <nav class="rules-nav">
    <a href="patient.php?id=<?= (int)$patient['id'] ?>" class="btn btn-ghost">← К пациенту</a>
    <a href="index.php" class="btn btn-ghost">🏠 На главную</a>
  </nav>

  <section class="patient-card">
    <h2 class="section-title">Поставь диагноз</h2>
    <p class="patient-meta">
      <?= htmlspecialchars($patient['fio']) ?>, <?= (int)$patient['age'] ?> лет
    </p>

    <!-- 3 диагноза -->
    <div class="diag-grid" id="diag-grid">
      <?php foreach ($diagnoses as $d): ?>
        <button class="diag-btn" data-correct="<?= !empty($d['correct']) ? '1' : '0' ?>">
          <span class="diag-icon"><?= !empty($d['svg']) ? $d['svg'] : htmlspecialchars($d['icon'] ?? '❓') ?></span>
          <span class="diag-label"><?= htmlspecialchars($d['label'] ?? '—') ?></span>
        </button>
      <?php endforeach; ?>
    </div>

    <p class="form-error hidden" id="diag-error"></p>

    <div class="patient-actions">
      <a href="patient.php?id=<?= (int)$patient['id'] ?>" class="btn btn-ghost">← Назад</a>
    </div>
  </section>

</main>

<script>
  // Выбор диагноза: верный → игра, неверный → снятие очков
  (function () {
    var grid = document.getElementById('diag-grid');
    var err = document.getElementById('diag-error');
    var PENALTY = 10;

    grid?.querySelectorAll('.diag-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var correct = btn.dataset.correct === '1';
        grid.querySelectorAll('.diag-btn').forEach(function (b) {
          b.classList.remove('correct', 'wrong');
        });

        if (correct) {
          btn.classList.add('correct');
          if (err) { err.classList.add('hidden'); err.textContent = ''; }
          // ПЕРЕЛИНКОВКА: верный диагноз → игра (treatment.php)
          setTimeout(function () {
            window.location.href = 'treatment.php?id=<?= (int)$patient['id'] ?>';
          }, 500);
        } else {
          btn.classList.add('wrong');
          // снятие очков (локально; Мидл-2 подключит бэкенд)
          try {
            var nick = localStorage.getItem('nick') || 'guest';
            var score = Number(localStorage.getItem('score_' + nick) || 0);
            score = Math.max(0, score - PENALTY);
            localStorage.setItem('score_' + nick, String(score));
          } catch (e) {}
          if (err) {
            err.textContent = 'Неверный диагноз. −' + PENALTY + ' очков. Попробуй ещё раз.';
            err.classList.remove('hidden');
          }
          setTimeout(function () { btn.classList.remove('wrong'); }, 1000);
        }
      });
    });
  })();
</script>
</body>
</html>