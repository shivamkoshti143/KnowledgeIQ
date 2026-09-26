<?php
// php-server/controllers/notification.controller.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class NotificationController {
    public static function list(): void {
        $user = AuthMiddleware::requireAuth();
        $notifications = DB::getNotifications((int)$user['id']);
        json_response($notifications);
    }

    public static function markAllRead(): void {
        $user = AuthMiddleware::requireAuth();
        DB::execute("UPDATE notifications SET readAt = NOW() WHERE userId = ?", [(int)$user['id']]);
        json_response(['ok' => true]);
    }

    public static function markRead(int $id): void {
        $user = AuthMiddleware::requireAuth();
        $notif = DB::getOne("SELECT * FROM notifications WHERE id = ? AND userId = ?", [$id, (int)$user['id']]);
        if (!$notif) {
            error_response("Notification not found", 404);
        }

        DB::execute("UPDATE notifications SET readAt = NOW() WHERE id = ?", [$id]);
        $updated = DB::getOne("SELECT * FROM notifications WHERE id = ?", [$id]);
        json_response($updated);
    }
}
