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
  <title>Правила — Смена 03</title>
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

<main class="rules-page">
  <nav class="rules-nav">
    <a href="index.php" class="btn btn-ghost">← В меню</a>
    <a href="<?= e($gameUrl) ?>" class="btn btn-primary">▶ Играть</a>
  </nav>

  <header class="rules-header">
    <div class="hero-badge">Правила игры</div>
    <h1 class="rules-title">Смена <span>03</span></h1>
    <p class="rules-subtitle">Как проходит дежурство фельдшера скорой помощи</p>
  </header>

  <div class="rules-content">

    <section class="rules-block card">
      <h2>🎯 Цель</h2>
      <p>Продержаться одну смену — <b><?= (int) round($cfg['shiftSeconds'] / 60) ?> минут</b>, не потеряв
         репутацию. За это время подстанцию проходят <b><?= $total ?> пациентов</b> и
         <b><?= $calls ?> звонка диспетчера</b>. Смена заканчивается, когда пациенты закончились,
         вышло время или репутация упала до нуля.</p>
    </section>

    <section class="rules-block card">
      <h2>🩺 Как проходит приём</h2>
      <ol class="rules-list">
        <li><b>Осмотр.</b> Появляется пациент: жалобы и показатели — давление, пульс,
            температура, сатурация. Смотрим на симптомы, а не на имя.</li>
        <li><b>Диагноз.</b> Три варианта, верный один. Ошибка не переводит к следующему
            пациенту: можно пробовать снова, но каждый промах бьёт по очкам и репутации.</li>
        <li><b>Лечение.</b> Нажимай действия в правильном порядке. Порядок — это и есть
            профессия: нитроглицерин до кислорода, холод до повязки.</li>
        <li><b>Звонок.</b> После некоторых пациентов звонит диспетчер: решение из трёх
            вариантов с реальными последствиями для счёта, репутации и времени.</li>
      </ol>
    </section>

    <section class="rules-block card">
      <h2>💯 Очки и репутация</h2>
      <table class="rules-table">
        <thead>
          <tr><th>Событие</th><th>Счёт</th><th>Репутация</th></tr>
        </thead>
        <tbody>
          <tr><td>Верный диагноз</td><td class="pos">+<?= (int) $cfg['pointsCorrect'] ?></td><td>—</td></tr>
          <tr><td>Лечение в правильном порядке</td><td class="pos">+<?= (int) $cfg['pointsTreatment'] ?></td><td>—</td></tr>
          <tr><td>Неверный диагноз</td><td class="neg">−<?= (int) $cfg['penaltyDiagnosis'] ?></td><td class="neg">−<?= (int) $cfg['penaltyDiagnosis'] ?></td></tr>
          <tr><td>Неверный шаг лечения</td><td>—</td><td class="neg">−<?= (int) $cfg['penaltyTreatment'] ?></td></tr>
          <tr><td>Решение по звонку</td><td class="pos">от −20 до +40</td><td class="pos">от −25 до +15</td></tr>
        </tbody>
      </table>
      <p class="rules-note">Репутация стартует со 100 и не восстанавливается. При нуле смена
         проваливается — даже если время ещё осталось.</p>
    </section>

    <section class="rules-block card">
      <h2>📞 Звонки диспетчера</h2>
      <p>Это проверка не диагноза, а головы. Каждый вариант показывает последствия сразу:
         сколько очков, репутации и секунд он стоит. Правильного ответа «для всех» нет —
         есть тот, который вы готовы защищать на разборе смены.</p>
    </section>

    <section class="rules-block card">
      <h2>⏱ Таймер и пауза</h2>
      <ul class="rules-list">
        <li>Смена длится <b><?= (int) round($cfg['shiftSeconds'] / 60) ?> минут</b>; таймер — в шапке,
            последняя минута подсвечивается.</li>
        <li>Пауза — кнопка <b>⏸</b> или клавиша <b>P</b> / <b>Esc</b>. Таймер останавливается,
            состояние сохраняется в базу.</li>
        <li>«Завершить смену» из паузы закрывает дежурство и отправляет результат в топ.</li>
      </ul>
    </section>

    <section class="rules-block card">
      <h2>💾 Сохранение и продолжение</h2>
      <p>Игра сохраняет смену по нику: автоматически раз в 20 секунд, при паузе и при закрытии
         вкладки. Ник — от 3 до 16 символов, регистрация не нужна.</p>
      <p>Если зайти на главную и ввести тот же ник, появится плашка «Найдено сохранение» —
         можно продолжить с того же пациента, с теми же очками и остатком времени.</p>
    </section>

    <section class="rules-block card">
      <h2>🏆 Победа и поражение</h2>
      <ul class="rules-list">
        <li><b>Победа:</b> приняты все пациенты, репутация выше нуля.</li>
        <li><b>Конец смены:</b> вышло время — в топ уходит то, что успели набрать.</li>
        <li><b>Поражение:</b> репутация упала до 0 раньше времени.</li>
        <li>Итоговый счёт = очки за диагнозы, лечение и решения по звонкам. Лучшая смена
            каждого игрока попадает в топ-5 на главной.</li>
      </ul>
    </section>

    <section class="rules-block card">
      <h2>⌨️ Горячие клавиши</h2>
      <table class="rules-table">
        <tbody>
          <tr><td><b>P</b> или <b>Esc</b></td><td>пауза / продолжить</td></tr>
          <tr><td><b>Tab</b></td><td>переход между вариантами диагноза и лечения</td></tr>
          <tr><td><b>Enter</b> на главной</td><td>открыть ввод ника</td></tr>
        </tbody>
      </table>
    </section>

  </div>

  <div class="rules-footer">
    <a href="index.php" class="btn btn-ghost">← В меню</a>
    <a href="<?= e($gameUrl) ?>" class="btn btn-primary btn-lg">▶ Начать смену</a>
  </div>
</main>

</body>
</html>
