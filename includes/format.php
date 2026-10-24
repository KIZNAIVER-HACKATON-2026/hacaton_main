<?php
/**
 * includes/format.php — мелкие помощники для вывода.
 */

/** Экранирование текста в HTML. */
function e(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Русская форма множественного числа: plural(5, 'смена', 'смены', 'смен'). */
function plural(int $n, string $one, string $few, string $many): string
{
    $n = abs($n) % 100;
    $n1 = $n % 10;
    if ($n > 10 && $n < 20) return $many;
    if ($n1 > 1 && $n1 < 5) return $few;
    if ($n1 === 1) return $one;
    return $many;
}

/** Тысячи через пробел: 12500 -> 12 500. */
function num_ru(int|float|null $n): string
{
    return number_format((float) $n, 0, ',', ' ');
}

/** Дата смены: 21.10 · 02:35 */
function fmt_shift_date(?string $sqlDate): string
{
    if (!$sqlDate) return '—';
    $ts = strtotime($sqlDate);
    if ($ts === false) return '—';
    return date('d.m', $ts) . ' · ' . date('H:i', $ts);
}

/** «сегодня», «вчера», «3 дня назад». */
function fmt_ago(?string $sqlDate): string
{
    if (!$sqlDate) return '';
    $ts = strtotime($sqlDate);
    if ($ts === false) return '';

    $today = strtotime('today');
    $day = strtotime('today', $ts);

    $diffDays = (int) round(($today - $day) / 86400);
    if ($diffDays <= 0) return 'сегодня';
    if ($diffDays === 1) return 'вчера';
    if ($diffDays < 7) return $diffDays . ' ' . plural($diffDays, 'день', 'дня', 'дней') . ' назад';

    return date('d.m.Y', $ts);
}
