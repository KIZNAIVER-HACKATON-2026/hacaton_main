<?php
// rules.php — отдельная страница с полными правилами игры
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Правила — Смена 03</title>
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>

<main class="rules-page">
  <nav class="rules-nav">
    <a href="index.php" class="btn btn-ghost">← На главную</a>
    <a href="index.php#play" class="btn btn-primary">▶ Играть</a>
  </nav>

  <header class="rules-header">
    <div class="hero-badge">📖 Правила игры</div>
    <h1 class="rules-title">Смена <span>03</span></h1>
    <p class="rules-subtitle">Как проходит дежурство фельдшера скорой помощи</p>
  </header>

  <div class="rules-content">

    <section class="rules-block card">
      <h2>🎯 Цель</h2>
      <p>Продержаться одну смену (5 минут), не потеряв репутацию. Спасай пациентов,
         ставь верные диагнозы и набирай очки. Смена заканчивается, когда вышло время
         или репутация упала до нуля.</p>
    </section>

    <section class="rules-block card">
      <h2>🩺 Как проходит приём</h2>
      <ol class="rules-list">
        <li><b>Осмотр.</b> Появляется пациент: сначала фото, затем симптомы и показатели —
            давление, пульс, температура, сатурация.</li>
        <li><b>Диагноз.</b> Жмёшь «Начать лечение» — открываются 3 иконки с диагнозами.
            Нужно выбрать один.</li>
        <li><b>Лечение.</b> Верный диагноз открывает мини-игру: собери правильную
            последовательность действий.</li>
      </ol>
    </section>

    <section class="rules-block card">
      <h2>💯 Очки и репутация</h2>
      <table class="rules-table">
        <thead>
          <tr><th>Событие</th><th>Счёт</th><th>Репутация</th></tr>
        </thead>
        <tbody>
          <tr><td>Верный диагноз</td><td class="pos">+50</td><td>—</td></tr>
          <tr><td>Неверный диагноз</td><td class="neg">−10</td><td class="neg">−10</td></tr>
          <tr><td>Успешное лечение</td><td class="pos">+бонус</td><td>—</td></tr>
        </tbody>
      </table>
      <p class="rules-note">Ошибка не завершает приём — можно попробовать ещё раз,
         но каждый промах бьёт по репутации. При репутации 0 смена провалена.</p>
    </section>

    <section class="rules-block card">
      <h2>⏱ Таймер и пауза</h2>
      <ul class="rules-list">
        <li>Смена длится <b>5 минут</b> — таймер вверху экрана.</li>
        <li>Кнопка ⏸ ставит игру на паузу и сохраняет прогресс.</li>
        <li>«Выйти в меню» из паузы завершает текущую смену.</li>
      </ul>
    </section>

    <section class="rules-block card">
      <h2>💾 Сохранение</h2>
      <p>Игра сохраняет смену по нику: на паузе и при выходе. Ник — от 3 до 16 символов.
         Он же попадает в топ-5 на главной.</p>
    </section>

    <section class="rules-block card">
      <h2>🏆 Победа и поражение</h2>
      <ul class="rules-list">
        <li><b>Победа:</b> дожил до конца смены с репутацией выше нуля.</li>
        <li><b>Поражение:</b> репутация упала до 0 раньше времени.</li>
        <li>Итоговый счёт = очки за диагнозы и лечение. Он идёт в топ.</li>
      </ul>
    </section>

  </div>

  <div class="rules-footer">
    <a href="index.php" class="btn btn-ghost">← На главную</a>
    <a href="index.php#play" class="btn btn-primary btn-lg">▶ Играть</a>
  </div>
</main>

<script src="assets/app.js"></script>
</body>
</html>