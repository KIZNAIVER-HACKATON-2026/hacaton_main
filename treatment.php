<?php
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Лечение — Смена 03</title>
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/style.css">
  <link rel="stylesheet" href="assets/css/pixel-theme.css">
  <link rel="stylesheet" href="assets/css/readability.css">
</head>
<body>
<main class="patient-page">
  <nav class="rules-nav">
    <a href="diagnosis.php?id=<?= (int)$id ?>" class="btn btn-ghost">← Назад</a>
    <a href="index.php" class="btn btn-ghost">🏠 На главную</a>
  </nav>
  <section class="patient-card">
    <h2 class="section-title">Лечение</h2>
    <p class="patient-meta">Мини-игра «последовательность действий» — в разработке (Мидл-3).</p>
  </section>
</main>
</body>
</html>