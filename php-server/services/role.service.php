<?php
// php-server/services/role.service.php

require_once __DIR__ . '/../utils/db.php';

class RoleService {
    public const REQUIRED_PERMISSIONS = [
        ['name' => "Home", 'key' => "home", 'parent' => null, 'sort' => 1],
        ['name' => "My Knowledge", 'key' => "tasks", 'parent' => null, 'sort' => 2],
        ['name' => "Browse", 'key' => "browse", 'parent' => null, 'sort' => 3],
        ['name' => "Submit Knowledge", 'key' => "create-task", 'parent' => null, 'sort' => 4],
        ['name' => "Knowledge Base", 'key' => "knowledge-feed", 'parent' => null, 'sort' => 5],
        ['name' => "Recommended", 'key' => "recommended", 'parent' => null, 'sort' => 6],
        ['name' => "Bookmarks", 'key' => "bookmarks", 'parent' => null, 'sort' => 7],
        ['name' => "Knowledge Assistant", 'key' => "ai-assistant", 'parent' => null, 'sort' => 8],
        ['name' => "Notifications", 'key' => "notifications", 'parent' => null, 'sort' => 9],
        ['name' => "Dashboard", 'key' => "dashboard", 'parent' => null, 'sort' => 10],
        ['name' => "Approvals", 'key' => "approvals_parent", 'parent' => null, 'sort' => 11],
        ['name' => "Task Approval", 'key' => "task_approval", 'parent' => "Approvals", 'sort' => 12],
        ['name' => "File Reapproval", 'key' => "task_reapproval", 'parent' => "Approvals", 'sort' => 13],
        ['name' => "Site Settings", 'key' => "site_settings", 'parent' => null, 'sort' => 14],
        ['name' => "Manage Taxonomy", 'key' => "manage_taxonomy", 'parent' => null, 'sort' => 15],
        ['name' => "Departments", 'key' => "taxonomy_departments", 'parent' => "Manage Taxonomy", 'sort' => 16],
        ['name' => "Categories", 'key' => "taxonomy_categories", 'parent' => "Manage Taxonomy", 'sort' => 17],
        ['name' => "Add Knowledge Post", 'key' => "add_knowledge_post_admin", 'parent' => null, 'sort' => 18],
        ['name' => "Knowledge Base Delete", 'key' => "knowledge_base_delete", 'parent' => null, 'sort' => 19],
        ['name' => "Knowledge Recommendation", 'key' => "knowledge_recommendation", 'parent' => null, 'sort' => 20],
        ['name' => "Users", 'key' => "users_full", 'parent' => null, 'sort' => 21]
    ];

    public const DEFAULT_EMPLOYEE_PERMISSIONS = [
        "home", "tasks", "browse", "create-task", "knowledge-feed",
        "recommended", "bookmarks", "ai-assistant", "notifications"
    ];

    public static function initRoleManagementSchema(): void {
        $pdo = DB::pdo();

        // 1. Roles table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS roles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                role_name VARCHAR(100) NOT NULL DEFAULT '',
                description TEXT DEFAULT '',
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        try {
            $pdo->exec("ALTER TABLE roles ADD COLUMN IF NOT EXISTS role_name VARCHAR(100) NOT NULL DEFAULT '' AFTER name;");
        } catch (Throwable $e) {}

        // 2. Permissions table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS permissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                permission_name VARCHAR(100) NOT NULL UNIQUE,
                permission_key VARCHAR(100) NOT NULL UNIQUE,
                module VARCHAR(50) NOT NULL DEFAULT 'general',
                menu VARCHAR(100) NOT NULL DEFAULT 'general',
                parent_permission_id INT DEFAULT NULL,
                sort_order INT DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_permission_id) REFERENCES permissions(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        // 3. Role_permissions table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS role_permissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                role_id INT NOT NULL,
                permission_id INT NOT NULL,
                granted_by INT DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_role_perm (role_id, permission_id),
                FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
                FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");

        try {
            $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INT DEFAULT NULL;");
        } catch (Throwable $e) {}

        // Seed / Sync required permissions
        $validKeys = array_column(self::REQUIRED_PERMISSIONS, 'key');
        $inClause = implode(',', array_fill(0, count($validKeys), '?'));
        try {
            $delStmt = $pdo->prepare("DELETE FROM permissions WHERE permission_key NOT IN ($inClause)");
            $delStmt->execute($validKeys);
        } catch (Throwable $e) {}

        foreach (self::REQUIRED_PERMISSIONS as $item) {
            $stmt = $pdo->prepare("SELECT id FROM permissions WHERE permission_key = ?");
            $stmt->execute([$item['key']]);
            $existing = $stmt->fetch();

            if (!$existing) {
                $ins = $pdo->prepare("
                    INSERT INTO permissions (permission_name, permission_key, module, menu, sort_order, created_at, updated_at)
                    VALUES (?, ?, 'general', 'general', ?, NOW(), NOW())
                ");
                $ins->execute([$item['name'], $item['key'], $item['sort']]);
            } else {
                $upd = $pdo->prepare("
                    UPDATE permissions SET permission_name = ?, permission_key = ?, sort_order = ? WHERE id = ?
                ");
                $upd->execute([$item['name'], $item['key'], $item['sort'], $existing['id']]);
            }
        }

        // Link parent relationships
        foreach (self::REQUIRED_PERMISSIONS as $item) {
            if ($item['parent']) {
                $pStmt = $pdo->prepare("SELECT id FROM permissions WHERE permission_name = ? LIMIT 1");
                $pStmt->execute([$item['parent']]);
                $pRow = $pStmt->fetch();
                if ($pRow) {
                    $uStmt = $pdo->prepare("UPDATE permissions SET parent_permission_id = ? WHERE permission_key = ?");
                    $uStmt->execute([$pRow['id'], $item['key']]);
                }
            } else {
                $uStmt = $pdo->prepare("UPDATE permissions SET parent_permission_id = NULL WHERE permission_key = ?");
                $uStmt->execute([$item['key']]);
            }
        }

        // Ensure default User role exists
        $rStmt = $pdo->query("SELECT id FROM roles WHERE LOWER(name) = 'user' OR LOWER(role_name) = 'user' LIMIT 1");
        $userRole = $rStmt->fetch();
        $defaultUserRoleId = null;

        if (!$userRole) {
            $insRole = $pdo->prepare("
                INSERT INTO roles (name, role_name, description, status, created_at, updated_at)
                VALUES ('User', 'User', 'Standard user with regular portal access', 'active', NOW(), NOW())
            ");
            $insRole->execute();
            $defaultUserRoleId = (int)$pdo->lastInsertId();

            $pKeys = self::DEFAULT_EMPLOYEE_PERMISSIONS;
            $pIn = implode(',', array_fill(0, count($pKeys), '?'));
            $permStmt = $pdo->prepare("SELECT id FROM permissions WHERE permission_key IN ($pIn)");
            $permStmt->execute($pKeys);
            $perms = $permStmt->fetchAll();

            $rpIns = $pdo->prepare("INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by, created_at) VALUES (?, ?, 1, NOW())");
            foreach ($perms as $p) {
                $rpIns->execute([$defaultUserRoleId, $p['id']]);
            }
        } else {
            $defaultUserRoleId = (int)$userRole['id'];
        }

        if ($defaultUserRoleId) {
            $pdo->prepare("UPDATE users SET role_id = ? WHERE role_id IS NULL AND role != 'admin'")->execute([$defaultUserRoleId]);
        }
    }

    public static function getPermissions(): array {
        $permKeys = array_column(self::REQUIRED_PERMISSIONS, 'key');
        $inClause = implode(',', array_fill(0, count($permKeys), '?'));
        return DB::query(
            "SELECT id, permission_name, permission_key, parent_permission_id, sort_order 
             FROM permissions 
             WHERE permission_key IN ($inClause) 
             ORDER BY sort_order ASC, id ASC",
            $permKeys
        );
    }

    public static function getUserPermissions(int $userId): array {
        $user = DB::getOne("SELECT id, role, role_id FROM users WHERE id = ? LIMIT 1", [$userId]);
        if (!$user) return self::DEFAULT_EMPLOYEE_PERMISSIONS;

        if ($user['role'] === 'admin') {
            return array_column(self::REQUIRED_PERMISSIONS, 'key');
        }

        if (!empty($user['role_id'])) {
            $rows = DB::query("
                SELECT p.permission_key
                FROM role_permissions rp
                JOIN permissions p ON rp.permission_id = p.id
                JOIN roles r ON rp.role_id = r.id
                WHERE rp.role_id = ? AND r.status = 'active'
                ORDER BY p.sort_order ASC, p.id ASC
            ", [$user['role_id']]);

            if (!empty($rows)) {
                return array_column($rows, 'permission_key');
            }
        }

        return self::DEFAULT_EMPLOYEE_PERMISSIONS;
    }

    public static function getRoles(): array {
        $roles = DB::query("
            SELECT id, COALESCE(NULLIF(role_name, ''), name) AS role_name, name, description, status, created_at, updated_at 
            FROM roles 
            ORDER BY id ASC
        ");

        if (empty($roles)) return [];

        $roleIds = array_column($roles, 'id');
        $inClause = implode(',', array_fill(0, count($roleIds), '?'));
        $rpRows = DB::query("
            SELECT rp.role_id, p.id AS permission_id, p.permission_name, p.permission_key, p.parent_permission_id, p.sort_order
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id IN ($inClause)
            ORDER BY p.sort_order ASC, p.id ASC
        ", $roleIds);

        $permMap = [];
        foreach ($rpRows as $rp) {
            $permMap[$rp['role_id']][] = [
                'id' => $rp['permission_id'],
                'permission_name' => $rp['permission_name'],
                'parent_permission_id' => $rp['parent_permission_id']
            ];
        }

        foreach ($roles as &$r) {
            $perms = $permMap[$r['id']] ?? [];
            $r['permissions'] = $perms;
            $r['attached_permissions'] = implode(', ', array_column($perms, 'permission_name'));
        }

        return $roles;
    }

    public static function createRole(string $roleName, array $permissionIds = [], int $grantedBy = 1): array {
        $cleanName = trim($roleName);
        if (empty($cleanName)) {
            throw new InvalidArgumentException("Role name is required.");
        }

        $existing = DB::getOne(
            "SELECT id FROM roles WHERE LOWER(name) = LOWER(?) OR LOWER(role_name) = LOWER(?) LIMIT 1",
            [$cleanName, $cleanName]
        );
        if ($existing) {
            throw new RuntimeException("Role already exists.");
        }

        $adminCheck = DB::getOne("SELECT id FROM users WHERE id = ? LIMIT 1", [$grantedBy]);
        if (!$adminCheck) {
            $firstAdmin = DB::getOne("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
            $grantedBy = $firstAdmin ? (int)$firstAdmin['id'] : 1;
        }

        $pdo = DB::pdo();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("
                INSERT INTO roles (name, role_name, description, status, created_at, updated_at)
                VALUES (?, ?, '', 'active', NOW(), NOW())
            ");
            $stmt->execute([$cleanName, $cleanName]);
            $roleId = (int)$pdo->lastInsertId();

            $numericPermIds = array_filter(array_map('intval', (array)$permissionIds), fn($id) => $id > 0);
            $validPermIds = [];
            if (!empty($numericPermIds)) {
                $inClause = implode(',', array_fill(0, count($numericPermIds), '?'));
                $validRows = DB::query("SELECT id FROM permissions WHERE id IN ($inClause)", $numericPermIds);
                $validPermIds = array_column($validRows, 'id');
            }

            if (!empty($validPermIds)) {
                $rpStmt = $pdo->prepare("
                    INSERT INTO role_permissions (role_id, permission_id, granted_by, created_at)
                    VALUES (?, ?, ?, NOW())
                ");
                foreach ($validPermIds as $pId) {
                    $rpStmt->execute([$roleId, (int)$pId, $grantedBy]);
                }
            }

            $pdo->commit();

            $roles = self::getRoles();
            foreach ($roles as $r) {
                if ($r['id'] === $roleId) return $r;
            }

            return DB::getOne("
                SELECT id, COALESCE(NULLIF(role_name, ''), name) AS role_name, name, description, status, created_at, updated_at 
                FROM roles WHERE id = ?
            ", [$roleId]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function updateRole(int $roleId, ?string $roleName, ?array $permissionIds, int $grantedBy = 1): array {
        $curr = DB::getOne("SELECT id, COALESCE(NULLIF(role_name, ''), name) AS role_name FROM roles WHERE id = ?", [$roleId]);
        if (!$curr) {
            throw new RuntimeException("Role not found.");
        }

        $cleanName = trim($roleName !== null ? $roleName : $curr['role_name']);
        if (empty($cleanName)) {
            throw new InvalidArgumentException("Role name cannot be empty.");
        }

        $existing = DB::getOne(
            "SELECT id FROM roles WHERE (LOWER(name) = LOWER(?) OR LOWER(role_name) = LOWER(?)) AND id != ? LIMIT 1",
            [$cleanName, $cleanName, $roleId]
        );
        if ($existing) {
            throw new RuntimeException("Another role with this name already exists.");
        }

        $adminCheck = DB::getOne("SELECT id FROM users WHERE id = ? LIMIT 1", [$grantedBy]);
        if (!$adminCheck) {
            $firstAdmin = DB::getOne("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
            $grantedBy = $firstAdmin ? (int)$firstAdmin['id'] : 1;
        }

        $pdo = DB::pdo();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("UPDATE roles SET name = ?, role_name = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$cleanName, $cleanName, $roleId]);

            if (is_array($permissionIds)) {
                $pdo->prepare("DELETE FROM role_permissions WHERE role_id = ?")->execute([$roleId]);
                $numericPermIds = array_filter(array_map('intval', $permissionIds), fn($id) => $id > 0);
                if (!empty($numericPermIds)) {
                    $inClause = implode(',', array_fill(0, count($numericPermIds), '?'));
                    $validRows = DB::query("SELECT id FROM permissions WHERE id IN ($inClause)", $numericPermIds);
                    $validPermIds = array_column($validRows, 'id');

                    $ins = $pdo->prepare("INSERT INTO role_permissions (role_id, permission_id, granted_by, created_at) VALUES (?, ?, ?, NOW())");
                    foreach ($validPermIds as $pId) {
                        $ins->execute([$roleId, (int)$pId, $grantedBy]);
                    }
                }
            }

            $pdo->commit();

            $roles = self::getRoles();
            foreach ($roles as $r) {
                if ($r['id'] === $roleId) return $r;
            }
            return $curr;
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function deleteRole(int $roleId): bool {
        DB::execute("DELETE FROM roles WHERE id = ?", [$roleId]);
        return true;
    }

    public static function getUserRoleAssignments(): array {
        return DB::query("
            SELECT 
              u.id, 
              u.name, 
              u.email, 
              u.role AS system_role,
              u.role_id,
              u.status,
              COALESCE(u.last_active_at, (SELECT MAX(al.createdAt) FROM activity_logs al WHERE al.userId = u.id), u.createdAt) AS last_active_at,
              COALESCE(u.last_active_at, (SELECT MAX(al.createdAt) FROM activity_logs al WHERE al.userId = u.id), u.createdAt) AS lastActive,
              COALESCE(NULLIF(r.role_name, ''), r.name) AS custom_role_name,
              GROUP_CONCAT(p.permission_name ORDER BY p.sort_order SEPARATOR ', ') AS attached_permissions
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            LEFT JOIN permissions p ON rp.permission_id = p.id
            GROUP BY u.id, u.name, u.email, u.role, u.role_id, u.status, u.last_active_at, u.createdAt, r.role_name, r.name
            ORDER BY u.name ASC
        ");
    }

    public static function assignRoleToUser(int $userId, ?int $roleId): ?array {
        if ($roleId) {
            $roleCheck = DB::getOne("SELECT id FROM roles WHERE id = ?", [$roleId]);
            if (!$roleCheck) {
                throw new RuntimeException("Selected role does not exist.");
            }
        } else {
            $roleId = null;
        }

        DB::execute("UPDATE users SET role_id = ? WHERE id = ?", [$roleId, $userId]);

        return DB::getOne("
            SELECT 
              u.id, 
              u.name, 
              u.email, 
              u.role AS system_role,
              u.role_id,
              u.status,
              COALESCE(NULLIF(r.role_name, ''), r.name) AS custom_role_name,
              GROUP_CONCAT(p.permission_name ORDER BY p.sort_order SEPARATOR ', ') AS attached_permissions
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            LEFT JOIN permissions p ON rp.permission_id = p.id
            WHERE u.id = ?
            GROUP BY u.id, u.name, u.email, u.role, u.role_id, u.status, r.role_name, r.name
        ", [$userId]);
    }
}
