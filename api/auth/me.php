<?php
declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

$user = null;
if (!empty($_SESSION['user_id'])) {
    $stmt = db()->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $row = $stmt->fetch();
    if ($row) {
        $user = public_user($row);
    } else {
        unset($_SESSION['user_id']);
    }
}

json_out(['user' => $user, 'csrf' => csrf_token()]);
