<?php
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/rules.php';

json_out(['difficulties' => DIFFICULTIES, 'points' => POINTS]);
