<?php
$topPlayers = []; // позже бэкенд положит рекорды
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Смена 03 — Дежурство фельдшера</title>
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>

<!-- ===================== ЛЕНДИНГ ===================== -->
<main id="landing" class="screen active">
  <header class="hero" id="play">
    <div class="hero-badge">🚑 Симулятор профессии</div>
    <h1 class="hero-title">Смена <span>03</span></h1>
    <p class="hero-subtitle">
      Одна ночь на подстанции скорой помощи. Принимай пациентов,
      ставь диагнозы и спасай жизни — пока не кончилось дежурство.
    </p>
    <div class="hero-actions">
      <button class="btn btn-primary btn-lg" id="btn-play">▶ Играть</button>
      <a href="rules.php" class="btn btn-ghost btn-lg">📖 Правила игры</a>
    </div>
  </header>

    </div>

  </section>

  <section id="top" class="top-block">
    <h2 class="section-title">🏆 Топ-5 смен</h2>
    <ol class="top-list" id="top-list">
      <?php if (empty($topPlayers)): ?>
        <li class="top-empty">Пока никто не сдал смену. Будь первым!</li>
      <?php else: foreach ($topPlayers as $i => $p): ?>
        <li class="top-item">
          <span class="top-rank"><?= $i + 1 ?></span>
          <span class="top-nick"><?= htmlspecialchars($p['nick']) ?></span>
          <span class="top-score"><?= (int)$p['score'] ?> очков</span>
        </li>
      <?php endforeach; endif; ?>
    </ol>
  </section>
</main>

<!-- ===================== МИНИ-МОДАЛКА: ТОЛЬКО НИК ===================== -->
<div id="nick-screen" class="modal hidden">
  <div class="modal-card">
    <h2>Как тебя зовут?</h2>
    <label class="field">
      <span>Ник для сейва и топа (3–16 символов)</span>
      <input type="text" id="nick-input" maxlength="16" placeholder="Например, Фельдшер01" autocomplete="off">
    </label>
    <p class="form-error hidden" id="nick-error"></p>
    <div class="modal-actions">
      <button class="btn btn-primary" id="btn-start">Начать смену</button>
      <button class="btn btn-ghost" id="btn-cancel">Отмена</button>
    </div>
  </div>
</div>

<!-- ===================== ИГРОВОЙ ЭКРАН ===================== -->
<main id="game" class="screen">

  <div id="hud" class="hud">
    <div class="hud-item"><span class="hud-label">Смена</span><span id="hud-timer">05:00</span></div>
    <div class="hud-item"><span class="hud-label">Счёт</span><span id="hud-score">0</span></div>
    <div class="hud-item"><span class="hud-label">Репутация</span><span id="hud-rep">100</span></div>
    <button class="btn btn-icon" id="btn-pause" title="Пауза">⏸</button>
  </div>

  <section id="patient-screen" class="patient-screen hidden">
    <div class="patient-avatar" id="patient-avatar">🧑</div>
    <div class="patient-info hidden" id="patient-info">
      <h2 class="patient-name" id="patient-name">—</h2>
      <p class="patient-meta" id="patient-meta">—</p>
      <div class="symptoms" id="symptoms"></div>
      <div class="vitals" id="vitals"></div>
    </div>
    <div class="patient-actions hidden" id="patient-actions">
      <button class="btn btn-primary btn-lg" id="btn-treat"> Начать игру</button>
    </div>
  </section>
</div>

<script src="assets/patients.js"></script>
<script src="assets/app.js"></script>

<script>
  // ПЕРЕЛИНКОВКА: «Начать игру» → страница карточки пациента
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('btn-treat');
    if (btn) {
      btn.addEventListener('click', function () {
        window.location.href = 'patient.php';
      });
    }
  });
</script>
</body>
</html>