<?php
// php-server/controllers/bootstrap.controller.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../services/role.service.php';

class BootstrapController {
    public static function index(): void {
        $authUser = AuthMiddleware::requireAuth();
        $userId = (int)$authUser['id'];

        $departments = DB::getDepartments();
        $tags = DB::getTags();
        $categories = DB::getCategories();
        $comments = DB::query("SELECT * FROM comments ORDER BY createdAt ASC");
        $users = DB::getUsers();
        $notifications = DB::getNotifications($userId);
        $bookmarks = DB::getUserBookmarks($userId);
        $aiChats = DB::getAiChatsByUser($userId);

        $freshUser = DB::getUserById($userId) ?: $authUser;
        $permissions = RoleService::getUserPermissions($userId);
        $freshUser['permissions'] = $permissions;

        $siteSettings = DB::getSiteSettings();
        $isRestricted = !empty($siteSettings['restrictByDepartment']);
        $isAdmin = ($freshUser['role'] ?? '') === 'admin';
        $userDeptId = !empty($freshUser['departmentId']) ? (int)$freshUser['departmentId'] : null;

        if ($isRestricted && !$isAdmin) {
            if ($userDeptId !== null) {
                // Fetch tasks for user's department + user's own uploads
                $tasks = DB::getTasks(['departmentId' => $userDeptId]);
                $userUploadedTasks = DB::getTasks(['uploaderId' => $userId]);
                $taskIds = array_column($tasks, 'id');
                foreach ($userUploadedTasks as $ut) {
                    if (!in_array($ut['id'], $taskIds, true)) {
                        $tasks[] = $ut;
                    }
                }

                // Fetch knowledge posts for user's department + user's own uploads
                $knowledgePosts = DB::getKnowledgePosts(['departmentId' => $userDeptId]);
                $userUploadedKnowledge = array_filter(
                    DB::getKnowledgePosts(),
                    fn($k) => (int)($k['authorId'] ?? $k['uploaderId'] ?? 0) === $userId
                );
                $kIds = array_column($knowledgePosts, 'id');
                foreach ($userUploadedKnowledge as $uk) {
                    if (!in_array($uk['id'], $kIds, true)) {
                        $knowledgePosts[] = $uk;
                    }
                }

                // Fetch videos for user's department + user's own uploads
                $videos = DB::getVideos(['departmentId' => $userDeptId]);
                $userUploadedVideos = DB::getVideos(['uploaderId' => $userId]);
                $vIds = array_column($videos, 'id');
                foreach ($userUploadedVideos as $uv) {
                    if (!in_array($uv['id'], $vIds, true)) {
                        $videos[] = $uv;
                    }
                }
            } else {
                // If user has no department, only show their own content
                $tasks = DB::getTasks(['uploaderId' => $userId]);
                $knowledgePosts = array_values(array_filter(
                    DB::getKnowledgePosts(),
                    fn($k) => (int)($k['authorId'] ?? $k['uploaderId'] ?? 0) === $userId
                ));
                $videos = DB::getVideos(['uploaderId' => $userId]);
            }
        } else {
            $tasks = DB::getTasks();
            $knowledgePosts = DB::getKnowledgePosts();
            $videos = DB::getVideos();
        }

        $myVideos = array_values(array_filter(DB::getVideos(['uploaderId' => $userId]), fn($v) => (int)$v['uploaderId'] === $userId));
        $myTasks = array_values(array_filter(DB::getTasks(['uploaderId' => $userId]), fn($t) => (int)$t['uploaderId'] === $userId));
        $myKnowledgePosts = array_values(array_filter(DB::getKnowledgePosts(), fn($k) => (int)($k['authorId'] ?? $k['uploaderId'] ?? 0) === $userId));

        json_response([
            'currentUser' => $freshUser,
            'departments' => $departments,
            'tags' => $tags,
            'categories' => $categories,
            'videos' => $videos,
            'comments' => $comments,
            'users' => $users,
            'notifications' => $notifications,
            'tasks' => $tasks,
            'myTasks' => $myTasks,
            'knowledgePosts' => $knowledgePosts,
            'myKnowledgePosts' => $myKnowledgePosts,
            'myVideos' => $myVideos,
            'siteSettings' => $siteSettings,
            'bookmarks' => $bookmarks,
            'aiChats' => $aiChats
        ]);
    }
}
