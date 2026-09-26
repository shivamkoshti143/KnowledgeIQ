<?php
// php-server/controllers/role.controller.php

require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../services/role.service.php';

class RoleController {
    public static function listRoles(): void {
        AuthMiddleware::requireAdmin();
        $roles = RoleService::getRoles();
        json_response($roles);
    }

    public static function listPermissions(): void {
        AuthMiddleware::requireAdmin();
        $permissions = RoleService::getPermissions();
        json_response($permissions);
    }

    public static function createRole(): void {
        $user = AuthMiddleware::requireAdmin();
        $input = get_json_input();
        $roleName = $input['role_name'] ?? $input['name'] ?? $input['roleName'] ?? '';
        $permissionIds = $input['permission_ids'] ?? $input['permissions'] ?? [];

        try {
            $newRole = RoleService::createRole($roleName, (array)$permissionIds, (int)($user['id'] ?? 1));
            json_response(['success' => true, 'role' => $newRole, 'message' => "Role created successfully."], 201);
        } catch (Throwable $e) {
            error_response($e->getMessage(), 400);
        }
    }

    public static function updateRole(int $id): void {
        $user = AuthMiddleware::requireAdmin();
        $input = get_json_input();
        $roleName = $input['role_name'] ?? $input['name'] ?? $input['roleName'] ?? null;
        $permissionIds = $input['permission_ids'] ?? $input['permissions'] ?? null;

        try {
            $updated = RoleService::updateRole($id, $roleName, $permissionIds !== null ? (array)$permissionIds : null, (int)($user['id'] ?? 1));
            json_response(['success' => true, 'role' => $updated, 'message' => "Role updated successfully."]);
        } catch (Throwable $e) {
            error_response($e->getMessage(), 400);
        }
    }

    public static function deleteRole(int $id): void {
        AuthMiddleware::requireAdmin();
        try {
            RoleService::deleteRole($id);
            json_response(['success' => true, 'message' => "Role deleted successfully."]);
        } catch (Throwable $e) {
            error_response($e->getMessage(), 400);
        }
    }

    public static function listRoleAssignments(): void {
        AuthMiddleware::requireAdmin();
        $assignments = RoleService::getUserRoleAssignments();
        json_response($assignments);
    }

    public static function assignRole(): void {
        AuthMiddleware::requireAdmin();
        $input = get_json_input();
        $userId = (int)($input['userId'] ?? 0);
        $roleId = isset($input['roleId']) && $input['roleId'] !== '' ? (int)$input['roleId'] : null;

        if (!$userId) {
            error_response("Invalid user ID.", 400);
        }

        try {
            $updated = RoleService::assignRoleToUser($userId, $roleId);
            json_response(['success' => true, 'user' => $updated, 'message' => "Role assigned successfully."]);
        } catch (Throwable $e) {
            error_response($e->getMessage(), 400);
        }
    }
}
