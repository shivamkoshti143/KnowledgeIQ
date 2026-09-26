<?php
// php-server/index.php

require_once __DIR__ . '/config/cors.php';
handleCors();

require_once __DIR__ . '/config/database.php';
Database::loadEnv();
require_once __DIR__ . '/utils/response.php';
require_once __DIR__ . '/services/role.service.php';

// Route Controllers
require_once __DIR__ . '/controllers/auth.controller.php';
require_once __DIR__ . '/controllers/bootstrap.controller.php';
require_once __DIR__ . '/controllers/department.controller.php';
require_once __DIR__ . '/controllers/category.controller.php';
require_once __DIR__ . '/controllers/tag.controller.php';
require_once __DIR__ . '/controllers/task.controller.php';
require_once __DIR__ . '/controllers/knowledge.controller.php';
require_once __DIR__ . '/controllers/video.controller.php';
require_once __DIR__ . '/controllers/bookmark.controller.php';
require_once __DIR__ . '/controllers/comment.controller.php';
require_once __DIR__ . '/controllers/notification.controller.php';
require_once __DIR__ . '/controllers/site_settings.controller.php';
require_once __DIR__ . '/controllers/user.controller.php';
require_once __DIR__ . '/controllers/admin.controller.php';
require_once __DIR__ . '/controllers/role.controller.php';
require_once __DIR__ . '/controllers/ai.controller.php';
require_once __DIR__ . '/controllers/recommended.controller.php';
require_once __DIR__ . '/controllers/teams.controller.php';

// Initialize role schema if needed (once per server lifecycle)
$schemaFlag = sys_get_temp_dir() . '/taskiq_role_schema_init';
if (!file_exists($schemaFlag)) {
    try {
        RoleService::initRoleManagementSchema();
        @touch($schemaFlag);
    } catch (Throwable $e) {
        error_log("Failed to init role schema: " . $e->getMessage());
    }
}

// Parse Method & URI
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Normalize path: strip any leading base paths if hosted under subdirectory (e.g. /ABM-TaskIQ/api)
if (preg_match('#/api(/.*)?$#', $uri, $m)) {
    $path = '/api' . ($m[1] ?? '');
} else {
    $path = $uri;
}
$path = rtrim($path, '/');
if (empty($path)) $path = '/api';

// Route Dispatcher
    try {
        // --- AUTH (MICROSOFT ENTRA ID) ---
        if ($method === 'GET' && $path === '/api/auth/microsoft') {
            AuthController::microsoftLogin();
        } elseif ($method === 'GET' && $path === '/api/auth/microsoft/callback') {
            AuthController::microsoftCallback();

        // --- AUTH (MANUAL & SESSION) ---
        } elseif ($method === 'POST' && $path === '/api/auth/login') {
            AuthController::login();
        } elseif ($method === 'POST' && $path === '/api/auth/signup') {
            AuthController::signup();
        } elseif ($method === 'POST' && $path === '/api/auth/logout') {
            AuthController::logout();
        } elseif ($method === 'GET' && $path === '/api/auth/me') {
            AuthController::me();

        // --- AUTH (LEGACY FALLBACK) ---
        } elseif ($method === 'POST' && $path === '/api/auth/register') {
            AuthController::register();
        } elseif ($method === 'POST' && $path === '/api/auth/register/verify-otp') {
            AuthController::registerVerifyOtp();
        } elseif ($method === 'POST' && $path === '/api/auth/register/resend-otp') {
            AuthController::registerResendOtp();
        } elseif ($method === 'POST' && $path === '/api/auth/send-otp') {
            AuthController::sendOtp();
        } elseif ($method === 'POST' && $path === '/api/auth/verify-otp' || ($method === 'POST' && $path === '/api/auth/verify-otp-legacy')) {
            AuthController::verifyOtp();
        } elseif ($method === 'POST' && $path === '/api/auth/resend-otp') {
            AuthController::resendOtp();

        // --- TEAMS CONNECTION (LEGACY/HISTORICAL) ---
        } elseif ($method === 'POST' && $path === '/api/auth/teams/connect') {
            AuthController::teamsConnect();
        } elseif ($method === 'GET' && $path === '/api/auth/teams/status') {
            AuthController::teamsStatus();

        // --- TEAMS BOT WEBHOOK (LEGACY/HISTORICAL) ---
        } elseif ($method === 'POST' && $path === '/api/teams/messages') {
            TeamsController::messages();
        }

    // --- BOOTSTRAP ---
    elseif ($method === 'GET' && $path === '/api/bootstrap') {
        BootstrapController::index();
    }

    // --- DEPARTMENTS ---
    elseif ($method === 'GET' && $path === '/api/departments') {
        DepartmentController::list();
    } elseif ($method === 'POST' && $path === '/api/departments') {
        DepartmentController::create();
    } elseif ($method === 'PUT' && preg_match('#^/api/departments/(\d+)$#', $path, $m)) {
        DepartmentController::update((int)$m[1]);
    } elseif ($method === 'DELETE' && preg_match('#^/api/departments/(\d+)$#', $path, $m)) {
        DepartmentController::delete((int)$m[1]);
    }

    // --- CATEGORIES ---
    elseif ($method === 'GET' && $path === '/api/categories') {
        CategoryController::list();
    } elseif ($method === 'POST' && $path === '/api/categories') {
        CategoryController::create();
    } elseif ($method === 'PUT' && preg_match('#^/api/categories/(\d+)$#', $path, $m)) {
        CategoryController::update((int)$m[1]);
    } elseif ($method === 'DELETE' && preg_match('#^/api/categories/(\d+)$#', $path, $m)) {
        CategoryController::delete((int)$m[1]);
    }

    // --- TAGS ---
    elseif ($method === 'GET' && $path === '/api/tags') {
        TagController::list();
    } elseif ($method === 'POST' && $path === '/api/tags') {
        TagController::create();
    } elseif ($method === 'DELETE' && preg_match('#^/api/tags/(\d+)$#', $path, $m)) {
        TagController::delete((int)$m[1]);
    }

    // --- TASKS ---
    elseif ($method === 'GET' && $path === '/api/tasks') {
        TaskController::list();
    } elseif ($method === 'POST' && $path === '/api/tasks') {
        TaskController::create();
    } elseif ($method === 'POST' && preg_match('#^/api/tasks/(\d+)/review$#', $path, $m)) {
        TaskController::review((int)$m[1]);
    } elseif ($method === 'POST' && preg_match('#^/api/tasks/(\d+)/recommend$#', $path, $m)) {
        TaskController::recommend((int)$m[1]);
    } elseif ($method === 'POST' && preg_match('#^/api/tasks/(\d+)/files/(\d+)/approve$#', $path, $m)) {
        TaskController::approveFile((int)$m[1], (int)$m[2]);
    } elseif ($method === 'GET' && preg_match('#^/api/tasks/(\d+)/comments$#', $path, $m)) {
        CommentController::listByTarget('tasks', (int)$m[1]);
    } elseif ($method === 'POST' && preg_match('#^/api/tasks/(\d+)/comments$#', $path, $m)) {
        CommentController::createForTarget('tasks', (int)$m[1]);
    } elseif ($method === 'GET' && preg_match('#^/api/tasks/(\d+)$#', $path, $m)) {
        TaskController::get((int)$m[1]);
    } elseif ($method === 'PUT' && preg_match('#^/api/tasks/(\d+)$#', $path, $m)) {
        TaskController::update((int)$m[1]);
    } elseif ($method === 'DELETE' && preg_match('#^/api/tasks/(\d+)$#', $path, $m)) {
        TaskController::delete((int)$m[1]);
    }

    // --- KNOWLEDGE BASE ---
    elseif ($method === 'GET' && $path === '/api/knowledge') {
        KnowledgeController::list();
    } elseif ($method === 'POST' && $path === '/api/knowledge') {
        KnowledgeController::create();
    } elseif ($method === 'POST' && preg_match('#^/api/knowledge/(\d+)/review$#', $path, $m)) {
        KnowledgeController::review((int)$m[1]);
    } elseif ($method === 'POST' && preg_match('#^/api/knowledge/(\d+)/recommend$#', $path, $m)) {
        KnowledgeController::recommend((int)$m[1]);
    } elseif ($method === 'GET' && preg_match('#^/api/knowledge/(\d+)/comments$#', $path, $m)) {
        CommentController::listByTarget('knowledge', (int)$m[1]);
    } elseif ($method === 'POST' && preg_match('#^/api/knowledge/(\d+)/comments$#', $path, $m)) {
        CommentController::createForTarget('knowledge', (int)$m[1]);
    } elseif ($method === 'GET' && preg_match('#^/api/knowledge/(\d+)$#', $path, $m)) {
        KnowledgeController::get((int)$m[1]);
    } elseif ($method === 'PUT' && preg_match('#^/api/knowledge/(\d+)$#', $path, $m)) {
        KnowledgeController::update((int)$m[1]);
    } elseif ($method === 'DELETE' && preg_match('#^/api/knowledge/(\d+)$#', $path, $m)) {
        KnowledgeController::delete((int)$m[1]);
    }

    // --- VIDEOS ---
    elseif ($method === 'GET' && $path === '/api/videos') {
        VideoController::list();
    } elseif ($method === 'POST' && $path === '/api/videos') {
        VideoController::create();
    } elseif ($method === 'POST' && preg_match('#^/api/videos/(\d+)/review$#', $path, $m)) {
        VideoController::review((int)$m[1]);
    } elseif ($method === 'POST' && preg_match('#^/api/videos/(\d+)/recommend$#', $path, $m)) {
        VideoController::recommend((int)$m[1]);
    } elseif ($method === 'POST' && preg_match('#^/api/videos/(\d+)/view$#', $path, $m)) {
        VideoController::incrementView((int)$m[1]);
    } elseif ($method === 'GET' && preg_match('#^/api/videos/(\d+)/comments$#', $path, $m)) {
        CommentController::listByTarget('videos', (int)$m[1]);
    } elseif ($method === 'POST' && preg_match('#^/api/videos/(\d+)/comments$#', $path, $m)) {
        CommentController::createForTarget('videos', (int)$m[1]);
    } elseif ($method === 'GET' && preg_match('#^/api/videos/(\d+)$#', $path, $m)) {
        VideoController::get((int)$m[1]);
    } elseif ($method === 'DELETE' && preg_match('#^/api/videos/(\d+)$#', $path, $m)) {
        VideoController::delete((int)$m[1]);
    }

    // --- BOOKMARKS ---
    elseif ($method === 'GET' && $path === '/api/bookmarks') {
        BookmarkController::list();
    } elseif ($method === 'POST' && $path === '/api/bookmarks') {
        BookmarkController::add();
    } elseif ($method === 'DELETE' && $path === '/api/bookmarks') {
        BookmarkController::remove();
    }

    // --- NOTIFICATIONS ---
    elseif ($method === 'GET' && $path === '/api/notifications') {
        NotificationController::list();
    } elseif ($method === 'POST' && in_array($path, ['/api/notifications/read', '/api/notifications/read-all'], true)) {
        NotificationController::markAllRead();
    } elseif ($method === 'POST' && preg_match('#^/api/notifications/(\d+)/read$#', $path, $m)) {
        NotificationController::markRead((int)$m[1]);
    }

    // --- SITE SETTINGS ---
    elseif ($method === 'GET' && $path === '/api/site-settings') {
        SiteSettingsController::get();
    } elseif ($method === 'POST' && $path === '/api/site-settings') {
        SiteSettingsController::update();
    }

    // --- USERS ---
    elseif ($method === 'GET' && preg_match('#^/api/users/(\d+)$#', $path, $m)) {
        UserController::get((int)$m[1]);
    } elseif ($method === 'PUT' && preg_match('#^/api/users/(\d+)$#', $path, $m)) {
        UserController::update((int)$m[1]);
    }

    // --- ADMIN ---
    elseif ($method === 'POST' && preg_match('#^/api/admin/impersonate/(\d+)$#', $path, $m)) {
        AdminController::impersonate((int)$m[1]);
    } elseif ($method === 'GET' && $path === '/api/admin/activity/recent') {
        AdminController::recentActivity();
    } elseif ($method === 'GET' && in_array($path, ['/api/admin/analytics', '/api/admin/dashboard'], true)) {
        AdminController::analytics();
    } elseif ($method === 'GET' && $path === '/api/admin/microsoft-teams-health') {
        AuthController::teamsHealth();
    } elseif ($method === 'GET' && $path === '/api/admin/roles') {
        RoleController::listRoles();
    } elseif ($method === 'POST' && $path === '/api/admin/roles') {
        RoleController::createRole();
    } elseif ($method === 'PUT' && preg_match('#^/api/admin/roles/(\d+)$#', $path, $m)) {
        RoleController::updateRole((int)$m[1]);
    } elseif ($method === 'DELETE' && preg_match('#^/api/admin/roles/(\d+)$#', $path, $m)) {
        RoleController::deleteRole((int)$m[1]);
    } elseif ($method === 'GET' && $path === '/api/admin/permissions') {
        RoleController::listPermissions();
    } elseif ($method === 'GET' && in_array($path, ['/api/admin/role-assignments', '/api/admin/user-roles'], true)) {
        RoleController::listRoleAssignments();
    } elseif ($method === 'POST' && in_array($path, ['/api/admin/role-assignments', '/api/admin/user-roles'], true)) {
        RoleController::assignRole();
    } elseif ($method === 'GET' && $path === '/api/admin/users') {
        UserController::list();
    }

    // --- AI ---
    elseif ($method === 'POST' && $path === '/api/ai/chat') {
        AIController::chat();
    } elseif ($method === 'GET' && $path === '/api/ai/chats') {
        AIController::chats();
    }

    // --- RECOMMENDED ---
    elseif ($method === 'GET' && $path === '/api/recommended') {
        RecommendedController::list();
    }

    // --- NOT FOUND ---
    else {
        error_response("API endpoint not found: {$method} {$path}", 404);
    }
} catch (Throwable $e) {
    error_log("API exception: " . $e->getMessage());
    error_response($e->getMessage() ?: "Internal server error", 500);
}
