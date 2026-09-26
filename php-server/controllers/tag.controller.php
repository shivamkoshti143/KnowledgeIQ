<?php
// php-server/controllers/tag.controller.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class TagController {
    public static function list(): void {
        AuthMiddleware::requireAuth();
        $tags = DB::getTags();
        json_response($tags);
    }

    public static function create(): void {
        AuthMiddleware::requireAdmin();
        $input = get_json_input();
        $name = strtolower(ltrim(trim($input['name'] ?? ''), '#'));

        if (empty($name)) {
            error_response("Tag name is required", 400);
        }

        $id = DB::createTag($name);
        $tag = DB::getOne("SELECT * FROM tags WHERE id = ?", [$id]);
        json_response($tag, 201);
    }

    public static function delete(int $id): void {
        AuthMiddleware::requireAdmin();
        DB::deleteTag($id);
        json_response(['ok' => true]);
    }
}
