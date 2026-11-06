<?php
declare(strict_types=1);

require __DIR__ . '/env.php';
require __DIR__ . '/db.php';

// Session cookie: not readable by JavaScript (HttpOnly) and not sent on cross-site POSTs (SameSite).
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax',
    'secure'   => !empty($_SERVER['HTTPS']),
]);
session_name('BCQSESSID');
session_start();

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function json_out(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $status = 400): never
{
    json_out(['error' => $message], $status);
}

function body(): array
{
    $data = json_decode(file_get_contents('php://input') ?: '', true);
    return is_array($data) ? $data : [];
}

function require_method(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        fail('Method not allowed', 405);
    }
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

// Every state-changing request must echo the token in a header. A forged cross-site
// form cannot read the token, so it cannot pass this check.
function require_csrf(): void
{
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $sent)) {
        fail('Invalid or missing CSRF token', 403);
    }
}

function require_login(): int
{
    if (empty($_SESSION['user_id'])) {
        fail('Login required', 401);
    }
    return (int)$_SESSION['user_id'];
}

function public_user(array $u): array
{
    return [
        'id'     => (int)$u['id'],
        'name'   => $u['name'],
        'email'  => $u['email'],
    ];
}
