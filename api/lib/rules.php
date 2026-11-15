<?php
declare(strict_types=1);

const DIFFICULTIES = [
    'easy' => [
        'lives' => 5, 'fallSpeed' => 150, 'spawnMs' => 950, 'speedRamp' => 0.015,
        'rottenChance' => 0.14, 'boxChance' => 0.25,
        'puzzleSeconds' => 30, 'puzzleBonus' => 100,
    ],
    'medium' => [
        'lives' => 4, 'fallSpeed' => 210, 'spawnMs' => 780, 'speedRamp' => 0.02,
        'rottenChance' => 0.22, 'boxChance' => 0.22,
        'puzzleSeconds' => 20, 'puzzleBonus' => 150,
    ],
    'hard' => [
        'lives' => 3, 'fallSpeed' => 280, 'spawnMs' => 620, 'speedRamp' => 0.025,
        'rottenChance' => 0.30, 'boxChance' => 0.20,
        'puzzleSeconds' => 12, 'puzzleBonus' => 250,
    ],
];

const POINTS = ['banana' => 10];
const MAX_COMBO_MULT = 4;

// Upper bound for catch points the client may claim, based on how long the game
// actually ran on the server clock (puzzle time excluded). Assumes every item is
// caught at the best multiplier, with 2x slack.
// A tampered score above this is clamped and the game is flagged.
function max_plausible_catch_points(string $difficulty, int $activeSeconds): int
{
    $d = DIFFICULTIES[$difficulty];
    $spawns = (1000 / $d['spawnMs']) * max($activeSeconds, 3);
    $goodChance = 1 - $d['rottenChance'] - $d['boxChance'];
    $avgItem = $goodChance * POINTS['banana'];
    return (int)ceil($spawns * $avgItem * MAX_COMBO_MULT * 2);
}

function client_config(string $difficulty): array
{
    return DIFFICULTIES[$difficulty] + [
        'points' => POINTS,
        'maxComboMult' => MAX_COMBO_MULT,
    ];
}
