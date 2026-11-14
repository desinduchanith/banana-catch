<?php
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';

$userId = require_login();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_csrf();
    $in = body();
    $name = trim((string)($in['name'] ?? ''));
    if (mb_strlen($name) < 2 || mb_strlen($name) > 40) fail('Name must be 2–40 characters.', 422);
    $pdo->prepare('UPDATE users SET name = ? WHERE id = ?')->execute([$name, $userId]);
}

$u = $pdo->prepare('SELECT * FROM users WHERE id = ?');
$u->execute([$userId]);
$user = $u->fetch();

$s = $pdo->prepare('SELECT COUNT(*) AS games, COALESCE(MAX(score),0) AS best,
                    COALESCE(MAX(best_combo),0) AS best_combo
                    FROM games WHERE user_id = ? AND ended_at IS NOT NULL');
$s->execute([$userId]);
$stats = array_map('intval', $s->fetch());

$r = $pdo->prepare('SELECT difficulty, score, best_combo, ended_at
                    FROM games WHERE user_id = ? AND ended_at IS NOT NULL ORDER BY ended_at DESC LIMIT 8');
$r->execute([$userId]);

json_out([
    'user' => public_user($user) + ['joined' => $user['created_at']],
    'stats' => $stats,
    'recent' => $r->fetchAll(),
]);
