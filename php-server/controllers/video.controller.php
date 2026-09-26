<?php
// php-server/controllers/video.controller.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/upload.php';
require_once __DIR__ . '/../middleware/auth.php';

class VideoController {
    public static function list(): void {
        $user = AuthMiddleware::requireAuth();
        $isAdmin = ($user['role'] ?? '') === 'admin';
        $siteSettings = DB::getSiteSettings();

        $deptFilter = $_GET['departmentId'] ?? null;
        if (!empty($siteSettings['restrictByDepartment']) && !$isAdmin) {
            $freshUser = DB::getUserById((int)$user['id']);
            $userDeptId = !empty($freshUser['departmentId']) ? (int)$freshUser['departmentId'] : null;
            $deptFilter = $userDeptId ?: -1;
        }

        $filters = [
            'status' => $_GET['status'] ?? 'approved',
            'departmentId' => $deptFilter,
            'categoryId' => $_GET['categoryId'] ?? null,
            'q' => $_GET['q'] ?? null,
        ];
        $videos = DB::getVideos($filters);
        json_response($videos);
    }

    public static function get(int $id): void {
        $user = AuthMiddleware::requireAuth();
        $video = DB::getVideoById($id);
        if (!$video) {
            error_response("Video not found", 404);
        }

        $isAdmin = ($user['role'] ?? '') === 'admin';
        $siteSettings = DB::getSiteSettings();
        if (!empty($siteSettings['restrictByDepartment']) && !$isAdmin) {
            $freshUser = DB::getUserById((int)$user['id']);
            $userDeptId = !empty($freshUser['departmentId']) ? (int)$freshUser['departmentId'] : null;
            $videoDeptId = !empty($video['departmentId']) ? (int)$video['departmentId'] : null;
            $isOwner = (int)($video['uploaderId'] ?? 0) === (int)$user['id'];
            if (!$isOwner && $videoDeptId !== $userDeptId) {
                error_response("Access denied: You can only view videos from your department", 403);
            }
        }

        json_response($video);
    }

    public static function create(): void {
        $user = AuthMiddleware::requireAuth();
        $input = get_json_input();
        $title = trim($_POST['title'] ?? ($input['title'] ?? ''));
        $description = trim($_POST['description'] ?? ($input['description'] ?? ''));
        $departmentId = !empty($_POST['departmentId']) ? (int)$_POST['departmentId'] : (!empty($input['departmentId']) ? (int)$input['departmentId'] : null);
        $categoryId = !empty($_POST['categoryId']) ? (int)$_POST['categoryId'] : (!empty($input['categoryId']) ? (int)$input['categoryId'] : null);
        $tags = trim($_POST['tags'] ?? ($input['tags'] ?? ''));
        $saveAsDraft = ($_POST['saveAsDraft'] ?? ($input['saveAsDraft'] ?? '')) === 'true' || ($_POST['saveAsDraft'] ?? ($input['saveAsDraft'] ?? false)) === true;

        $file = UploadHandler::handleSingle('file');
        $videoUrl = $file ? $file['url'] : ($input['videoUrl'] ?? '');

        $videoId = DB::createVideo([
            'title' => $title,
            'description' => $description,
            'departmentId' => $departmentId,
            'categoryId' => $categoryId,
            'uploaderId' => (int)$user['id'],
            'videoUrl' => $videoUrl,
            'status' => $saveAsDraft ? 'draft' : 'pending',
            'tags' => $tags
        ]);

        $video = DB::getVideoById($videoId);

        if (!$saveAsDraft) {
            $admins = DB::query("SELECT id FROM users WHERE role = 'admin'");
            foreach ($admins as $admin) {
                DB::createNotification([
                    'userId' => $admin['id'],
                    'type' => 'approval_queue',
                    'message' => "{$video['title']} is waiting for review.",
                    'videoId' => $videoId
                ]);
            }
        }

        json_response($video, 201);
    }

    public static function incrementView(int $id): void {
        AuthMiddleware::requireAuth();
        $video = DB::getVideoById($id);
        if (!$video) {
            error_response("Video not found", 404);
        }
        $newCount = (int)($video['viewCount'] ?? 0) + 1;
        DB::updateVideo($id, ['viewCount' => $newCount]);
        json_response(['viewCount' => $newCount]);
    }

    public static function recommend(int $id): void {
        AuthMiddleware::requirePermission("knowledge_recommendation");
        $video = DB::getVideoById($id);
        if (!$video) {
            error_response("Video not found", 404);
        }
        $input = get_json_input();
        $isRec = !empty($input['isRecommended']) ? 1 : 0;
        DB::updateVideo($id, ['isRecommended' => $isRec]);
        $updated = DB::getVideoById($id);
        json_response($updated);
    }

    public static function review(int $id): void {
        $user = AuthMiddleware::requireAdmin();
        $video = DB::getVideoById($id);
        if (!$video) {
            error_response("Video not found", 404);
        }

        $input = get_json_input();
        $decision = ($input['decision'] ?? '') === 'approved' ? 'approved' : 'rejected';
        $remarks = $input['remarks'] ?? null;

        DB::updateVideo($id, [
            'status' => $decision,
            'rejectionRemarks' => $remarks,
            'approvedBy' => $user['id'],
            'approvedAt' => $decision === 'approved' ? DB::toMySQLDate() : null
        ]);

        $updated = DB::getVideoById($id);
        DB::createNotification([
            'userId' => $video['uploaderId'],
            'type' => "video_{$updated['status']}",
            'message' => "Your video \"{$video['title']}\" has been {$updated['status']}." . ($remarks ? " Remarks: {$remarks}" : ""),
            'videoId' => $id
        ]);

        json_response($updated);
    }

    public static function delete(int $id): void {
        AuthMiddleware::requireAdmin();
        $video = DB::getVideoById($id);
        if (!$video) {
            error_response("Video not found", 404);
        }

        $input = get_json_input();
        if ($video['uploaderId']) {
            $reasonText = !empty($input['reason']) ? " Reason: {$input['reason']}" : "";
            DB::createNotification([
                'userId' => $video['uploaderId'],
                'type' => "content_removed",
                'message' => "Content is removed by admin: Your video \"{$video['title']}\" was removed by an administrator.{$reasonText}",
                'taskId' => null
            ]);
        }

        DB::execute("DELETE FROM comments WHERE videoId = ?", [$id]);
        DB::execute("DELETE FROM bookmarks WHERE contentType = 'video' AND contentId = ?", [$id]);
        DB::execute("DELETE FROM videos WHERE id = ?", [$id]);

        json_response(['ok' => true]);
    }
}
