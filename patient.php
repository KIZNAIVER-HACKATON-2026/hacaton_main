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

function getAllPatients(): array {
    return [
        1 => [
            'id' => 1,
            'fio' => 'Иванов Пётр Сергеевич',
            'age' => 54,
            'emoji' => '🧔',
            'avatarBg' => '#DBEAFE',
            'symptoms' => ['Давящая боль в груди', 'Одышка', 'Холодный пот', 'Боль отдаёт в левую руку'],
            'vitals' => ['ad' => '150/95', 'pulse' => '102', 'temp' => '36.7', 'spo2' => '94%'],
            'diagnoses' => [
                ['label' => 'Инфаркт', 'icon' => '❤️‍🩹', 'correct' => true],
                ['label' => 'Гастрит', 'icon' => '🫃', 'correct' => false],
                ['label' => 'Остеохондроз', 'icon' => '🦴', 'correct' => false],
            ],
        ],
        2 => [
            'id' => 2,
            'fio' => 'Сидорова Анна Викторовна',
            'age' => 28,
            'emoji' => '👩',
            'avatarBg' => '#FCE7F3',
            'symptoms' => ['Температура 39.2', 'Сухой кашель', 'Головная боль', 'Слабость'],
            'vitals' => ['ad' => '110/70', 'pulse' => '98', 'temp' => '39.2', 'spo2' => '96%'],
            'diagnoses' => [
                ['label' => 'ОРВИ', 'icon' => '🤧', 'correct' => true],
                ['label' => 'Аппендицит', 'icon' => '🏥', 'correct' => false],
                ['label' => 'Мигрень', 'icon' => '🧠', 'correct' => false],
            ],
        ],
        3 => [
            'id' => 3,
            'fio' => 'Козлов Игорь Анатольевич',
            'age' => 41,
            'emoji' => '👨',
            'avatarBg' => '#FEF3C7',
            'symptoms' => ['Резкая боль в правом боку', 'Тошнота', 'Температура 37.8'],
            'vitals' => ['ad' => '130/80', 'pulse' => '92', 'temp' => '37.8', 'spo2' => '98%'],
            'diagnoses' => [
                ['label' => 'Аппендицит', 'icon' => '🏥', 'correct' => true],
                ['label' => 'Отравление', 'icon' => '🤢', 'correct' => false],
                ['label' => 'Радикулит', 'icon' => '🦴', 'correct' => false],
            ],
        ],
    ];
}

function getPatient(?int $id): array {
    $all = getAllPatients();
    if ($id !== null && isset($all[$id])) return $all[$id];
    return $all[array_rand($all)]; // случайный, если id не передан/неверный
}

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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Карточка пациента — Смена 03</title>
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/style.css">
  <link rel="stylesheet" href="assets/css/pixel-theme.css">
  <link rel="stylesheet" href="assets/css/readability.css">
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

  <section class="patient-card">

    <div class="patient-avatar"
         style="background: <?= htmlspecialchars($patient['avatarBg']) ?>">
      <?= htmlspecialchars($patient['emoji']) ?>
    </div>

    <h2 class="patient-name"><?= htmlspecialchars($patient['fio']) ?></h2>
    <p class="patient-meta"><?= (int)$patient['age'] ?> лет</p>

    <div class="symptoms">
      <?php foreach ($patient['symptoms'] as $s): ?>
        <span class="symptom"><?= htmlspecialchars($s) ?></span>
      <?php endforeach; ?>
    </div>

    <div class="vitals">
      <?php
      $labels = ['ad' => 'АД', 'pulse' => 'Пульс', 'temp' => 'Темп.', 'spo2' => 'SpO₂'];
      foreach ($labels as $key => $label):
          if (empty($patient['vitals'][$key])) continue; ?>
        <div class="vital">
          <span class="vital-label"><?= $label ?></span>
          <span class="vital-value"><?= htmlspecialchars($patient['vitals'][$key]) ?></span>
        </div>
      <?php endforeach; ?>
    </div>

    <!-- ПЕРЕЛИНКОВКА: кнопка «Начать лечение» → diagnosis.php?id=... -->
    <div class="patient-actions">
      <a href="diagnosis.php?id=<?= (int)$patient['id'] ?><?= $nickParam !== '' ? '&' . e($nickParam) : '' ?>"
         class="btn btn-primary btn-lg">
        💊 Начать лечение
      </a>
    </div>

  </section>

</main>

</body>
</html>