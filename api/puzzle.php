<?php
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/rules.php';
require __DIR__ . '/lib/BananaApi.php';

require_method('POST');
require_csrf();
require_login();

$game = $_SESSION['game'] ?? null;
if (!$game) fail('No active game', 409);

unset($_SESSION['puzzle']);

try {
    $puzzle = (new BananaApi(env('BANANA_API_URL'), env('CA_BUNDLE')))->fetchPuzzle();
} catch (RuntimeException $e) {
    error_log('[banana] ' . $e->getMessage());
    fail('Aww, the Mystery Box was empty! Keep catching — another one will drop soon.', 502);
}

$seconds = DIFFICULTIES[$game['difficulty']]['puzzleSeconds'];
$id = bin2hex(random_bytes(8));
$_SESSION['puzzle'] = [
    'id'        => $id,
    'game_id'   => $game['id'],
    'solution'  => $puzzle['solution'],
    'issued_at' => microtime(true),
    'deadline'  => microtime(true) + $seconds + 10,
];

$out = ['puzzle_id' => $id, 'image' => $puzzle['image'], 'seconds' => $seconds];
// Viva/demo mode only (SHOW_ANSWER=1 in .env): reveal the answer so it can be demonstrated.
if (env('SHOW_ANSWER') === '1') $out['answer_hint'] = $puzzle['solution'];
json_out($out);
