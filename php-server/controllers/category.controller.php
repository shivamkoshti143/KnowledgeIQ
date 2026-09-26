<?php
// php-server/controllers/category.controller.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class CategoryController {
    public static function list(): void {
        $categories = DB::getCategories();
        json_response($categories);
    }

    public static function create(): void {
        AuthMiddleware::requirePermission(["manage_taxonomy", "taxonomy_categories"]);
        $input = get_json_input();
        $name = trim($input['name'] ?? '');
        $description = trim($input['description'] ?? '');
        $departmentId = !empty($input['departmentId']) ? (int)$input['departmentId'] : null;

        if (empty($name)) {
            error_response("Category name is required", 400);
        }

        $id = DB::createCategory($name, $description, $departmentId);
        $category = DB::getCategoryById($id);
        json_response($category, 201);
    }

    public static function update(int $id): void {
        AuthMiddleware::requirePermission(["manage_taxonomy", "taxonomy_categories"]);
        $cat = DB::getCategoryById($id);
        if (!$cat) {
            error_response("Category not found", 404);
        }

        $input = get_json_input();
        $name = trim($input['name'] ?? ($cat['name'] ?? ''));
        if (empty($name)) {
            error_response("Category name is required", 400);
        }

        DB::updateCategory($id, ['name' => $name]);
        $updated = DB::getCategoryById($id);
        json_response($updated);
    }

    public static function delete(int $id): void {
        AuthMiddleware::requirePermission(["manage_taxonomy", "taxonomy_categories"]);
        DB::deleteCategory($id);
        json_response(['ok' => true]);
    }
}
