<?php
// php-server/middleware/activity.php

require_once __DIR__ . '/../utils/db.php';

function trackActivity(?array $user, string $route, string $method): void {
    if (!$user || empty($user['id'])) return;

    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';

    try {
        DB::execute("
            INSERT INTO activity_logs (userId, action, targetType, targetId, metadata, createdAt)
            VALUES (?, ?, ?, ?, ?, NOW())
        ", [
            (int)$user['id'],
            $route,
            $method,
            null,
            json_encode(['userAgent' => $userAgent, 'ip' => $ip])
        ]);
    } catch (Throwable $e) {}
}
