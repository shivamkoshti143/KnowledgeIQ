<?php
// php-server/controllers/department.controller.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class DepartmentController {
    public static function list(): void {
        $departments = DB::getDepartments();
        json_response($departments);
    }

    public static function create(): void {
        AuthMiddleware::requirePermission(["manage_taxonomy", "taxonomy_departments"]);
        $input = get_json_input();
        $name = trim($input['name'] ?? '');
        $description = trim($input['description'] ?? '');

        if (empty($name)) {
            error_response("Department name is required", 400);
        }

        $id = DB::createDepartment($name, $description);
        $dept = DB::getDepartmentById($id);
        json_response($dept, 201);
    }

    public static function update(int $id): void {
        AuthMiddleware::requirePermission(["manage_taxonomy", "taxonomy_departments"]);
        $dept = DB::getDepartmentById($id);
        if (!$dept) {
            error_response("Department not found", 404);
        }

        $input = get_json_input();
        $name = trim($input['name'] ?? $dept['name']);
        $description = trim($input['description'] ?? $dept['description']);

        DB::updateDepartment($id, ['name' => $name, 'description' => $description]);
        $updated = DB::getDepartmentById($id);
        json_response($updated);
    }

    public static function delete(int $id): void {
        AuthMiddleware::requirePermission(["manage_taxonomy", "taxonomy_departments"]);
        DB::deleteDepartment($id);
        json_response(['ok' => true]);
    }
}
