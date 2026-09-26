<?php
// php-server/controllers/bookmark.controller.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class BookmarkController {
    public static function list(): void {
        $user = AuthMiddleware::requireAuth();
        $bookmarks = DB::getUserBookmarks((int)$user['id']);
        json_response($bookmarks);
    }

    public static function add(): void {
        $user = AuthMiddleware::requireAuth();
        $input = get_json_input();
        $contentType = $input['contentType'] ?? '';
        $contentId = (int)($input['contentId'] ?? 0);

        if (!in_array($contentType, ['video', 'task', 'knowledge'], true) || !$contentId) {
            error_response("Invalid content type or ID", 400);
        }

        $id = DB::createBookmark((int)$user['id'], $contentType, $contentId);
        $bookmarks = DB::getUserBookmarks((int)$user['id']);
        $created = null;
        foreach ($bookmarks as $b) {
            if ((int)$b['id'] === $id) { $created = $b; break; }
        }
        json_response($created ?: ['id' => $id, 'contentType' => $contentType, 'contentId' => $contentId], 201);
    }

    public static function remove(): void {
        $user = AuthMiddleware::requireAuth();
        $input = get_json_input();
        $contentType = $input['contentType'] ?? '';
        $contentId = (int)($input['contentId'] ?? 0);

        if (!in_array($contentType, ['video', 'task', 'knowledge'], true) || !$contentId) {
            error_response("Invalid content type or ID", 400);
        }

        DB::deleteBookmark((int)$user['id'], $contentType, $contentId);
        json_response(['ok' => true]);
    }
}
