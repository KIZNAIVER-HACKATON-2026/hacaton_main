<?php
/**
 * includes/db.php — единственная точка подключения к БД.
 *
 * Использование:
 *   require_once __DIR__ . '/includes/db.php';
 *   $pdo = db();
 *
 * Если база недоступна — db() бросает RuntimeException, а страница
 * показывает аккуратную заглушку вместо белого экрана ошибки.
 */

function db_config(): array
{
    static $config = null;
    if ($config === null) {
        $config = require dirname(__DIR__) . '/config.php';
    }
    return $config;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $c = db_config();
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $c['host'],
        (int) $c['port'],
        $c['name'],
        $c['charset']
    );

    $pdo = new PDO($dsn, $c['user'], $c['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);

    return $pdo;
}

/** Безопасный вызов: возвращает PDO или null, если БД лежит. */
function db_or_null(): ?PDO
{
    try {
        return db();
    } catch (Throwable $e) {
        error_log('[shift03] DB error: ' . $e->getMessage());
        return null;
    }
}
