<?php
// php-server/controllers/ai.controller.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../services/ai.service.php';

class AIController {
    public static function chat(): void {
        $user = AuthMiddleware::requireAuth();
        $input = get_json_input();
        $userMessage = trim($input['message'] ?? '');

        if (empty($userMessage)) {
            error_response("Message is required", 400);
        }

        $reply = "";
        $references = [];

        try {
            $siteSettings = DB::getSiteSettings();
            $isAdmin = ($user['role'] ?? '') === 'admin';
            $userDeptId = null;
            if (!empty($siteSettings['restrictByDepartment']) && !$isAdmin) {
                $freshUser = DB::getUserById((int)$user['id']);
                $userDeptId = !empty($freshUser['departmentId']) ? (int)$freshUser['departmentId'] : -1;
            }

            $portalResult = AIService::buildPortalAnswer($userMessage, $userDeptId);
            if ($portalResult['reply'] !== "I couldn't find that in our portal.") {
                $reply = $portalResult['reply'];
                $references = $portalResult['references'];
            } else {
                try {
                    $res = AIService::callOpenRouter([['role' => 'user', 'content' => $userMessage]]);
                    $reply = $res['reply'];
                } catch (Throwable $e) {
                    $reply = "I couldn't find that in our portal, and external AI is currently unavailable.";
                }
            }
        } catch (Throwable $e) {
            error_response($e->getMessage() ?: "AI service unavailable", 502);
        }

        try {
            DB::createAiChat((int)$user['id'], $userMessage, $reply);
        } catch (Throwable $e) {}

        json_response(['reply' => $reply, 'references' => $references]);
    }

    public static function chats(): void {
        $user = AuthMiddleware::requireAuth();
        $chats = DB::getAiChatsByUser((int)$user['id']);
        json_response($chats);
    }

    public static function userChats(int $userId): void {
        AuthMiddleware::requireAdmin();
        $chats = DB::getAiChatsByUser($userId);
        json_response($chats);
    }
}
