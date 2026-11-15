<?php
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/rules.php';

require_method('POST');
require_csrf();
require_login();

$in = body();
$puzzle = $_SESSION['puzzle'] ?? null;
$game = $_SESSION['game'] ?? null;

if (!$game || !$puzzle || !hash_equals($puzzle['id'], (string)($in['puzzle_id'] ?? ''))
    || $puzzle['game_id'] !== $game['id']) {
    fail('No matching open puzzle', 409);
}

// Close the puzzle before anything else so it can never be scored twice.
unset($_SESSION['puzzle']);
$now = microtime(true);
$_SESSION['game']['puzzle_seconds'] += (int)round($now - $puzzle['issued_at']);

if (!empty($in['abandon']) && $now - $puzzle['issued_at'] < 15) {
    json_out(['abandoned' => true, 'puzzle_points' => $_SESSION['game']['puzzle_points']]);
}

$timedOut = $now > $puzzle['deadline'];
$answer = filter_var($in['answer'] ?? null, FILTER_VALIDATE_INT);
$correct = !$timedOut && $answer !== false && $answer === $puzzle['solution'];

$result = ['correct' => $correct, 'timed_out' => $timedOut];

if ($correct) {
    $bonus = DIFFICULTIES[$game['difficulty']]['puzzleBonus'];
    $_SESSION['game']['puzzle_points'] += $bonus;

    $result['bonus'] = $bonus;
}

$result['puzzle_points'] = $_SESSION['game']['puzzle_points'];
json_out($result);
