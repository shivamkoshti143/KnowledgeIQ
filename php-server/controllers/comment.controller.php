<?php
// php-server/controllers/comment.controller.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class CommentController {
    public static function listByTarget(string $type, int $id): void {
        AuthMiddleware::requireAuth();
        $filters = ($type === 'videos') ? ['videoId' => $id] : ['taskId' => $id];
        $comments = DB::getComments($filters);
        json_response($comments);
    }

    public static function createForTarget(string $type, int $id): void {
        $user = AuthMiddleware::requireAuth();
        $isTask = ($type === 'tasks');

        $item = null;
        $title = '';
        $uploaderId = null;

        if ($type === 'videos') {
            $item = DB::getVideoById($id);
            if ($item) { $title = $item['title']; $uploaderId = $item['uploaderId']; }
        } elseif ($type === 'tasks') {
            $item = DB::getTaskById($id);
            if ($item) { $title = $item['title']; $uploaderId = $item['uploaderId']; }
        } elseif ($type === 'knowledge') {
            $item = DB::getKnowledgePostById($id);
            if ($item) { $title = $item['title']; $uploaderId = $item['uploaderId'] ?? null; }
        }

        if (!$item) {
            error_response("Item not found", 404);
        }

        $input = get_json_input();
        $body = trim($input['body'] ?? '');
        if (empty($body)) {
            error_response("Comment body is required", 400);
        }

        $commentId = DB::createComment([
            'userId' => (int)$user['id'],
            'videoId' => ($type === 'videos') ? $id : null,
            'taskId' => ($type === 'tasks') ? $id : null,
            'body' => $body
        ]);

        $filters = ($type === 'videos') ? ['videoId' => $id] : ['taskId' => $id];
        $comments = DB::getComments($filters);
        $newComment = null;
        foreach ($comments as $c) {
            if ((int)$c['id'] === $commentId) { $newComment = $c; break; }
        }

        if ($uploaderId && (int)$uploaderId !== (int)$user['id']) {
            DB::createNotification([
                'userId' => $uploaderId,
                'type' => 'comment',
                'message' => "{$user['name']} commented on \"{$title}\".",
                'taskId' => ($type === 'tasks') ? $id : null,
                'videoId' => ($type === 'videos') ? $id : null
            ]);
        }

        json_response($newComment ?: ['id' => $commentId, 'body' => $body], 201);
    }
}
