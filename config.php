<?php
/**
 * config.php — настройки подключения к MySQL.
 *
 * Локально (OpenServer / этот воркспейс) значения по умолчанию рабочие.
 * На хостинге НЕ правьте этот файл — создайте рядом config.local.php,
 * он подхватится автоматически и перекрыт значения по умолчанию.
 * (config.local.php уже в .gitignore)
 */

$defaults = [
    'host'    => 'MySQL-8.4',
    'port'    => 3306,
    'name'    => 'shift03',
    'user'    => 'root',
    'pass'    => '',
    'charset' => 'utf8mb4', // В DSN должно быть utf8mb4: mysqlnd не знает 'utf8mb3'
];

$local = [];
$localFile = __DIR__ . '/config.local.php';
if (is_file($localFile)) {
    $maybe = require $localFile;
    if (is_array($maybe)) {
        $local = $maybe;
    }
}

return array_merge($defaults, $local);
