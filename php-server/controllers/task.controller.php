<?php
// php-server/controllers/task.controller.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/upload.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../services/role.service.php';

class TaskController {
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
            'status' => $_GET['status'] ?? null,
            'departmentId' => $deptFilter,
            'uploaderId' => $_GET['uploaderId'] ?? null,
            'q' => $_GET['q'] ?? null,
        ];
        $tasks = DB::getTasks($filters);
        json_response($tasks);
    }

    public static function get(int $id): void {
        $user = AuthMiddleware::requireAuth();
        $task = DB::getTaskById($id);
        if (!$task) {
            error_response("Task not found", 404);
        }

        $isAdmin = ($user['role'] ?? '') === 'admin';
        $siteSettings = DB::getSiteSettings();
        if (!empty($siteSettings['restrictByDepartment']) && !$isAdmin) {
            $freshUser = DB::getUserById((int)$user['id']);
            $userDeptId = !empty($freshUser['departmentId']) ? (int)$freshUser['departmentId'] : null;
            $taskDeptId = !empty($task['departmentId']) ? (int)$task['departmentId'] : null;
            $isOwner = (int)($task['uploaderId'] ?? 0) === (int)$user['id'];
            if (!$isOwner && $taskDeptId !== $userDeptId) {
                error_response("Access denied: You can only view tasks from your department", 403);
            }
        }

        json_response($task);
    }

    public static function create(): void {
        $user = AuthMiddleware::requireAuth();
        $input = get_json_input();
        $title = trim($_POST['title'] ?? ($input['title'] ?? ''));
        $description = trim($_POST['description'] ?? ($input['description'] ?? ''));
        $departmentId = !empty($_POST['departmentId']) ? (int)$_POST['departmentId'] : (!empty($input['departmentId']) ? (int)$input['departmentId'] : null);
        $categoryId = !empty($_POST['categoryId']) ? (int)$_POST['categoryId'] : (!empty($input['categoryId']) ? (int)$input['categoryId'] : null);
        $tags = trim($_POST['tags'] ?? ($input['tags'] ?? ''));
        $status = trim($_POST['status'] ?? ($input['status'] ?? 'pending'));

        if (empty($title)) {
            error_response("Title is required", 400);
        }

        $taskId = DB::createTask([
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
            DB::createTaskFile([
                'taskId' => $taskId,
                'fileUrl' => $file['url'],
                'fileName' => $file['originalname'],
                'fileExtension' => $file['extension'],
                'review_status' => 'pending'
            ]);
        }

        $task = DB::getTaskById($taskId);

        // Notify admins if pending
        if ($status === 'pending') {
            $admins = DB::query("SELECT id FROM users WHERE role = 'admin'");
            foreach ($admins as $admin) {
                DB::createNotification([
                    'userId' => $admin['id'],
                    'type' => 'task_approval_queue',
                    'message' => "{$task['title']} is waiting for review.",
                    'taskId' => $taskId
                ]);
            }
        }

        json_response($task, 201);
    }

    public static function update(int $id): void {
        $user = AuthMiddleware::requireAuth();
        $task = DB::getTaskById($id);
        if (!$task) {
            error_response("Task not found", 404);
        }

        $input = get_json_input();
        DB::updateTask($id, $input);
        $updated = DB::getTaskById($id);
        json_response($updated);
    }

    public static function review(int $id): void {
        $user = AuthMiddleware::requirePermission(["approvals_parent", "task_approval"]);
        $task = DB::getTaskById($id);
        if (!$task) {
            error_response("Task not found", 404);
        }

        $input = get_json_input();
        $decision = ($input['decision'] ?? '') === 'approved' ? 'approved' : 'rejected';
        $remarks = $input['remarks'] ?? null;

        DB::updateTask($id, [
            'status' => $decision,
            'rejectionRemarks' => $remarks,
            'approvedBy' => $user['id'],
            'approvedAt' => $decision === 'approved' ? DB::toMySQLDate() : null
        ]);

        $updated = DB::getTaskById($id);
        DB::createNotification([
            'userId' => $task['uploaderId'],
            'type' => "task_{$updated['status']}",
            'message' => "Your task \"{$task['title']}\" has been {$updated['status']}." . ($remarks ? " Remarks: {$remarks}" : ""),
            'taskId' => $id
        ]);

        json_response($updated);
    }

    public static function delete(int $id): void {
        $user = AuthMiddleware::requireAuth();
        $task = DB::getTaskById($id);
        if (!$task) {
            error_response("Task not found", 404);
        }

        $isOwner = (int)$task['uploaderId'] === (int)$user['id'];
        $userPerms = RoleService::getUserPermissions((int)$user['id']);
        $hasDeletePerm = ($user['role'] ?? '') === 'admin' || in_array('knowledge_base_delete', $userPerms, true);

        if (!$hasDeletePerm && !$isOwner) {
            error_response("You can only delete your own tasks", 403);
        }

        if ($isOwner && !$hasDeletePerm && $task['status'] !== 'pending') {
            error_response("Only pending tasks can be deleted by the owner", 400);
        }

        $input = get_json_input();
        if ($task['uploaderId'] && $hasDeletePerm && !$isOwner) {
            $reasonText = !empty($input['reason']) ? " Reason: {$input['reason']}" : "";
            DB::createNotification([
                'userId' => $task['uploaderId'],
                'type' => "content_removed",
                'message' => "Content is removed: Your submission \"{$task['title']}\" was removed.{$reasonText}",
                'taskId' => null
            ]);
        }

        DB::deleteTask($id);
        json_response(['ok' => true]);
    }

    public static function approveFile(int $taskId, int $fileId): void {
        AuthMiddleware::requirePermission(["approvals_parent", "task_reapproval"]);
        $task = DB::getTaskById($taskId);
        if (!$task) error_response("Task not found", 404);

        $files = DB::getTaskFiles($taskId);
        $found = null;
        foreach ($files as $f) {
            if ((int)$f['id'] === $fileId) { $found = $f; break; }
        }
        if (!$found) error_response("File not found", 404);

        $input = get_json_input();
        $decision = $input['decision'] ?? 'approved';
        $remarks = $input['remarks'] ?? null;

        DB::updateTaskFile($fileId, [
            'approvalStatus' => $decision,
            'adminRemarks' => $remarks
        ]);

        if ($decision === 'rejected') {
            DB::createNotification([
                'userId' => $task['uploaderId'],
                'type' => 'file_rejected',
                'message' => "Your file \"{$found['fileExtension']}\" for task \"{$task['title']}\" was rejected. Reason: " . ($remarks ?: "No reason provided"),
                'taskId' => $taskId
            ]);
        }

        $updated = DB::getTaskById($taskId);
        json_response($updated);
    }

    public static function recommend(int $id): void {
        AuthMiddleware::requirePermission("knowledge_recommendation");
        $task = DB::getTaskById($id);
        if (!$task) error_response("Task not found", 404);

        $input = get_json_input();
        $isRec = !empty($input['isRecommended']) ? 1 : 0;
        DB::execute("UPDATE tasks SET isRecommended = ? WHERE id = ?", [$isRec, $id]);

        $updated = DB::getTaskById($id);
        json_response($updated);
    }
}
