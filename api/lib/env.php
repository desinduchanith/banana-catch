<?php
declare(strict_types=1);

// Reads KEY=VALUE lines from the .env file in the project root.
function env(string $key, string $default = ''): string
{
    static $vars = null;

    if ($vars === null) {
        $vars = [];
        $lines = file(__DIR__ . '/../../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        foreach ($lines as $line) {
            if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
            [$name, $value] = explode('=', $line, 2);
            $vars[trim($name)] = trim($value);
        }
    }

    $value = $vars[$key] ?? '';
    return $value === '' ? $default : $value;
}
