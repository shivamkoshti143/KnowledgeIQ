<?php
// php-server/controllers/knowledge.controller.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/upload.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../services/role.service.php';

class KnowledgeController {
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
            'status' => $isAdmin ? ($_GET['status'] ?? null) : 'published',
            'departmentId' => $deptFilter,
            'categoryId' => $_GET['categoryId'] ?? null,
            'q' => $_GET['q'] ?? null,
        ];
        $posts = DB::getKnowledgePosts($filters);
        json_response($posts);
    }

    public static function get(int $id): void {
        $user = AuthMiddleware::requireAuth();
        $post = DB::getKnowledgePostById($id);
        if (!$post) {
            error_response("Knowledge post not found", 404);
        }

        $isAdmin = ($user['role'] ?? '') === 'admin';
        $siteSettings = DB::getSiteSettings();
        if (!empty($siteSettings['restrictByDepartment']) && !$isAdmin) {
            $freshUser = DB::getUserById((int)$user['id']);
            $userDeptId = !empty($freshUser['departmentId']) ? (int)$freshUser['departmentId'] : null;
            $postDeptId = !empty($post['departmentId']) ? (int)$post['departmentId'] : null;
            $isOwner = (int)($post['authorId'] ?? $post['uploaderId'] ?? 0) === (int)$user['id'];
            if (!$isOwner && $postDeptId !== $userDeptId) {
                error_response("Access denied: You can only view knowledge posts from your department", 403);
            }
        }

        json_response($post);
    }

    public static function create(): void {
        $user = AuthMiddleware::requireAuth();
        $input = get_json_input();
        $title = trim($_POST['title'] ?? ($input['title'] ?? ''));
        $description = trim($_POST['description'] ?? ($input['description'] ?? ''));
        $departmentId = !empty($_POST['departmentId']) ? (int)$_POST['departmentId'] : (!empty($input['departmentId']) ? (int)$input['departmentId'] : null);
        $categoryId = !empty($_POST['categoryId']) ? (int)$_POST['categoryId'] : (!empty($input['categoryId']) ? (int)$input['categoryId'] : null);
        $tags = trim($_POST['tags'] ?? ($input['tags'] ?? ''));
        $status = trim($_POST['status'] ?? ($input['status'] ?? 'published'));

        if (empty($title)) {
            error_response("Title is required", 400);
        }

        $postId = DB::createKnowledgePost([
            'title' => $title,
            'description' => $description,
            'departmentId' => $departmentId,
            'categoryId' => $categoryId,
            'uploaderId' => (int)$user['id'],
            'status' => $status,
            'tags' => $tags
        ]);

        $uploadedFiles = UploadHandler::handleMultiple('files');
        foreach ($uploadedFiles as $file) {
            DB::createKnowledgePostFile([
                'knowledgePostId' => $postId,
                'fileUrl' => $file['url'],
                'fileName' => $file['originalname'],
                'fileExtension' => $file['extension']
            ]);
        }

        $post = DB::getKnowledgePostById($postId);
        json_response($post, 201);
    }

    public static function update(int $id): void {
        AuthMiddleware::requirePermission("add_knowledge_post_admin");
        $post = DB::getKnowledgePostById($id);
        if (!$post) {
            error_response("Post not found", 404);
        }

        $input = get_json_input();
        DB::updateKnowledgePost($id, $input);
        $updated = DB::getKnowledgePostById($id);
        json_response($updated);
    }

    public static function review(int $id): void {
        AuthMiddleware::requirePermission(["approvals_parent", "task_approval"]);
        $post = DB::getKnowledgePostById($id);
        if (!$post) {
            error_response("Post not found", 404);
        }

        $input = get_json_input();
        $decision = ($input['decision'] ?? '') === 'published' ? 'published' : 'draft';
        $remarks = $input['remarks'] ?? null;

        DB::updateKnowledgePost($id, [
            'status' => $decision,
            'rejectionRemarks' => $remarks
        ]);

        $updated = DB::getKnowledgePostById($id);
        json_response($updated);
    }

    public static function recommend(int $id): void {
        AuthMiddleware::requirePermission("knowledge_recommendation");
        $post = DB::getKnowledgePostById($id);
        if (!$post) {
            error_response("Knowledge post not found", 404);
        }

        $input = get_json_input();
        $isRec = !empty($input['isRecommended']) ? 1 : 0;
        DB::updateKnowledgePost($id, ['isRecommended' => $isRec]);

        $updated = DB::getKnowledgePostById($id);
        json_response($updated);
    }

    public static function delete(int $id): void {
        $user = AuthMiddleware::requireAuth();
        $post = DB::getKnowledgePostById($id);
        if (!$post) {
            error_response("Knowledge post not found", 404);
        }

        $isOwner = (int)($post['authorId'] ?? $post['uploaderId'] ?? 0) === (int)$user['id'];
        $userPerms = RoleService::getUserPermissions((int)$user['id']);
        $hasDeletePerm = ($user['role'] ?? '') === 'admin' || in_array('knowledge_base_delete', $userPerms, true);

        if (!$hasDeletePerm && !$isOwner) {
            error_response("You can only delete your own posts", 403);
        }

        $input = get_json_input();
        if ($hasDeletePerm && !$isOwner && !empty($post['authorId'])) {
            $reasonText = !empty($input['reason']) ? " Reason: {$input['reason']}" : "";
            DB::createNotification([
                'userId' => $post['authorId'],
                'type' => "content_removed",
                'message' => "Content is removed: Your knowledge post \"{$post['title']}\" was removed.{$reasonText}",
                'taskId' => null
            ]);
        }

        DB::deleteKnowledgePost($id);
        json_response(['ok' => true]);
    }
}
