<?php
// php-server/controllers/admin.controller.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../services/role.service.php';

class AdminController {
    public static function impersonate(int $targetUserId): void {
        $user = AuthMiddleware::requireAdmin();
        $input = get_json_input();
        $adminUserId = (int)($input['adminUserId'] ?? 0);

        if (!$adminUserId || $adminUserId !== (int)$user['id']) {
            error_response("Invalid admin user.", 400);
        }

        $targetUser = DB::getUserById($targetUserId);
        if (!$targetUser) {
            error_response("User not found", 404);
        }

        if ($targetUser['role'] === 'admin') {
            error_response("Admin cannot impersonate another admin.", 400);
        }

        $permissions = RoleService::getUserPermissions($targetUserId);
        $payload = array_merge(DB::sanitizeUser($targetUser), ['permissions' => $permissions]);
        $secret = getenv('JWT_SECRET') ?: ($_ENV['JWT_SECRET'] ?? 'dev-taskiq-secret');
        $token = JWT::sign($payload, $secret, 28800);

        json_response(['token' => $token, 'user' => $payload]);
    }

    public static function recentActivity(): void {
        AuthMiddleware::requirePermission("dashboard");
        $logs = DB::query("
            SELECT al.*, u.name AS userName, u.email AS userEmail
            FROM activity_logs al
            LEFT JOIN users u ON al.userId = u.id
            ORDER BY al.createdAt DESC
            LIMIT 200
        ");
        json_response($logs);
    }

    public static function analytics(): void {
        AuthMiddleware::requirePermission("dashboard");
        $videos = DB::getVideos();
        $tasks = DB::getTasks();
        $knowledgePosts = DB::getKnowledgePosts();
        $users = DB::getUsers();
        $departments = DB::getDepartments();
        $comments = DB::query("SELECT id FROM comments");

        $approvedVideos = array_values(array_filter($videos, fn($v) => $v['status'] === 'approved'));
        $approvedTasks = array_values(array_filter($tasks, fn($t) => $t['status'] === 'approved'));
        $publishedKnowledge = array_values(array_filter($knowledgePosts, fn($k) => $k['status'] === 'published'));

        $deptStats = [];
        foreach ($departments as $dept) {
            $vCount = count(array_filter($videos, fn($v) => (int)$v['departmentId'] === (int)$dept['id']));
            $tCount = count(array_filter($tasks, fn($t) => (int)$t['departmentId'] === (int)$dept['id']));
            $kCount = count(array_filter($knowledgePosts, fn($k) => (int)$k['departmentId'] === (int)$dept['id']));
            $total = $vCount + $tCount + $kCount;
            $deptStats[] = [
                'department' => $dept,
                'videos' => $vCount,
                'tasks' => $tCount,
                'knowledge' => $kCount,
                'total' => $total
            ];
        }
        usort($deptStats, fn($a, $b) => $b['total'] <=> $a['total']);

        $userStats = [];
        foreach ($users as $u) {
            $uId = (int)$u['id'];
            $vCount = count(array_filter($videos, fn($v) => (int)$v['uploaderId'] === $uId));
            $tCount = count(array_filter($tasks, fn($t) => (int)$t['uploaderId'] === $uId));
            $kCount = count(array_filter($knowledgePosts, fn($k) => (int)($k['authorId'] ?? $k['uploaderId'] ?? 0) === $uId));
            $total = $vCount + $tCount + $kCount;
            if ($total > 0) {
                $userStats[] = [
                    'user' => $u,
                    'videos' => $vCount,
                    'tasks' => $tCount,
                    'knowledge' => $kCount,
                    'total' => $total
                ];
            }
        }
        usort($userStats, fn($a, $b) => $b['total'] <=> $a['total']);

        $pendingApprovals = count(array_filter($videos, fn($v) => $v['status'] === 'pending')) +
                            count(array_filter($tasks, fn($t) => $t['status'] === 'pending'));

        json_response([
            'overview' => [
                'totalVideos' => count($videos),
                'totalTasks' => count($tasks),
                'totalKnowledgePosts' => count($knowledgePosts),
                'totalUsers' => count($users),
                'totalComments' => count($comments),
                'pendingApprovals' => $pendingApprovals
            ],
            'statusStats' => [
                'tasks' => [
                    'pending' => count(array_filter($tasks, fn($t) => $t['status'] === 'pending')),
                    'approved' => count(array_filter($tasks, fn($t) => $t['status'] === 'approved')),
                    'rejected' => count(array_filter($tasks, fn($t) => $t['status'] === 'rejected'))
                ],
                'knowledge' => [
                    'published' => count(array_filter($knowledgePosts, fn($k) => $k['status'] === 'published')),
                    'draft' => count(array_filter($knowledgePosts, fn($k) => $k['status'] === 'draft'))
                ]
            ],
            'departmentStats' => array_slice($deptStats, 0, 10),
            'topContributors' => array_slice($userStats, 0, 10),
            'topVideos' => array_slice($approvedVideos, 0, 5),
            'topTasks' => array_slice($approvedTasks, 0, 5),
            'topKnowledge' => array_slice($publishedKnowledge, 0, 5)
        ]);
    }
}
