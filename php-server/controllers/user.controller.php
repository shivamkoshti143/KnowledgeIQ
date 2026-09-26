<?php
// php-server/controllers/user.controller.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class UserController {
    public static function list(): void {
        AuthMiddleware::requireAdmin();
        $users = DB::getUsers();
        json_response($users);
    }

    public static function get(int $id): void {
        AuthMiddleware::requireAuth();
        $user = DB::getUserById($id);
        if (!$user) {
            error_response("User not found", 404);
        }
        json_response($user);
    }

    public static function update(int $id): void {
        AuthMiddleware::requireAdmin();
        $user = DB::getUserById($id);
        if (!$user) {
            error_response("User not found", 404);
        }

        $input = get_json_input();
        $updated = DB::updateUser($id, $input);
        json_response($updated);
    }
}
