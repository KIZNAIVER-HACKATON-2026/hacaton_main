<?php
/**
 * api/_bootstrap.php — общие помощники JSON-эндпоинтов.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/data.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

/** Отдать JSON и завершить запрос. */
function jout(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Только POST. */
function require_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        jout(['ok' => false, 'error' => 'method_not_allowed'], 405);
    }
}

/** Тело запроса: понимает и JSON, и обычную форму. */
function request_data(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $json = json_decode($raw, true);
    if (is_array($json)) {
        return $json;
    }
    return $_POST ?: [];
}

/**
 * Проверка ника: 3–16 символов, буквы/цифры/пробел/дефис/подчёркивание.
 * Кириллица разрешена, эмодзи — нет (колонка utf8mb3 их не примет).
 * Возвращает очищенный ник или null.
 */
function clean_nickname(mixed $raw): ?string
{
    if (!is_string($raw)) return null;

    $nick = trim(preg_replace('/\s+/u', ' ', $raw) ?? '');
    if ($nick === '') return null;

    $len = mb_strlen($nick, 'UTF-8');
    if ($len < 3 || $len > 16) return null;

    if (!preg_match('/^[\p{L}\p{N} _-]+$/u', $nick)) return null;

    return $nick;
}

/** Ответ при недоступной БД. */
function out_db_down(): never
{
    jout([
        'ok'    => false,
        'db'    => false,
        'error' => 'db_unavailable',
    ], 503);
}

/** Есть ли у игрока сохранение — компактно, для модалки. */
function save_for_player(int $playerId): ?array
{
    $save = db_load_save($playerId);
    if (!$save) return null;

    $state = $save['state'];
    if (!empty($state['finished'])) return null; // смена уже сдана — продолжать нечего
    return [
        'score'             => (int) ($state['score'] ?? 0),
        'reputation'        => (int) ($state['reputation'] ?? 100),
        'remaining_seconds' => (int) ($state['remainingSeconds'] ?? $state['remaining_seconds'] ?? 0),
        'patient_index'     => (int) ($state['patientIndex'] ?? $state['patient_index'] ?? 0),
        'saved_at'          => $save['saved_at'],
    ];
}
