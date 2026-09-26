<?php
// php-server/controllers/recommended.controller.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../middleware/auth.php';

class RecommendedController {
    public static function list(): void {
        $user = AuthMiddleware::requireAuth();
        $isAdmin = ($user['role'] ?? '') === 'admin';
        $siteSettings = DB::getSiteSettings();

        $deptId = null;
        if (!empty($siteSettings['restrictByDepartment']) && !$isAdmin) {
            $freshUser = DB::getUserById((int)$user['id']);
            $deptId = !empty($freshUser['departmentId']) ? (int)$freshUser['departmentId'] : -1;
        }

        $recommended = DB::getRecommendedContent($deptId);
        json_response($recommended);
    }
}
