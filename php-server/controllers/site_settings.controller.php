<?php
// php-server/controllers/site_settings.controller.php

require_once __DIR__ . '/../utils/db.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/upload.php';
require_once __DIR__ . '/../middleware/auth.php';

class SiteSettingsController {
    public static function get(): void {
        $settings = DB::getSiteSettings();
        json_response($settings);
    }

    public static function update(): void {
        AuthMiddleware::requirePermission("site_settings");
        $input = get_json_input();
        $portalName = $_POST['portalName'] ?? ($input['portalName'] ?? null);
        $logoUrl = $_POST['logoUrl'] ?? ($input['logoUrl'] ?? null);
        $faviconUrl = $_POST['faviconUrl'] ?? ($input['faviconUrl'] ?? null);

        $restrictByDepartment = null;
        if (isset($_POST['restrictByDepartment'])) {
            $restrictByDepartment = (int)$_POST['restrictByDepartment'];
        } elseif (isset($input['restrictByDepartment'])) {
            $restrictByDepartment = (int)$input['restrictByDepartment'];
        }

        $logoFile = UploadHandler::handleSingle('logo', 'site');
        if ($logoFile) {
            $logoUrl = $logoFile['url'];
        }

        $faviconFile = UploadHandler::handleSingle('favicon', 'site');
        if ($faviconFile) {
            $faviconUrl = $faviconFile['url'];
        }

        $updates = [];
        if ($portalName !== null) $updates['portalName'] = $portalName;
        if ($logoUrl !== null) $updates['logoUrl'] = $logoUrl;
        if ($faviconUrl !== null) $updates['faviconUrl'] = $faviconUrl;
        if ($restrictByDepartment !== null) $updates['restrictByDepartment'] = $restrictByDepartment;

        $settings = DB::updateSiteSettings($updates);
        json_response($settings);
    }
}
