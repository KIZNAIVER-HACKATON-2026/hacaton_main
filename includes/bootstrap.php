<?php
/**
 * includes/bootstrap.php — общий вход для страниц и API.
 * Здесь же нормализация ника и «вход» по нику.
 */

require_once __DIR__ . '/data.php';
require_once __DIR__ . '/format.php';

/** Ник из строки запроса: 3–16 символов, буквы/цифры/пробел/дефис/подчёркивание. */
function normalize_nickname(mixed $raw): ?string
{
    if (!is_string($raw)) return null;

    $nick = trim(preg_replace('/\s+/u', ' ', $raw) ?? '');
    if ($nick === '') return null;

    $len = mb_strlen($nick, 'UTF-8');
    if ($len < 3 || $len > 16) return null;

    if (!preg_match('/^[\p{L}\p{N} _-]+$/u', $nick)) return null;

    return $nick;
}

/** Ник текущего игрока из GET/COOKIE или null. */
function current_nickname(): ?string
{
    $raw = $_GET['nick'] ?? $_COOKIE['shift03_nick'] ?? null;
    return normalize_nickname($raw);
}

/** Запомнить ник в cookie на 30 дней (JS-копия в localStorage — отдельно). */
function remember_nickname(string $nick): void
{
    if (headers_sent()) return;
    setcookie('shift03_nick', $nick, [
        'expires'  => time() + 60 * 60 * 24 * 30,
        'path'     => '/',
        'httponly' => false,
        'samesite' => 'Lax',
    ]);
}
