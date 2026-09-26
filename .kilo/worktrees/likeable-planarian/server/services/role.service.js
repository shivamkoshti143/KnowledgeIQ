const { pool } = require("../db");

const REQUIRED_PERMISSIONS = [
  // Core / Employee Features
  { name: "Home", key: "home", parent: null, sort: 1 },
  { name: "My Knowledge", key: "tasks", parent: null, sort: 2 },
  { name: "Browse", key: "browse", parent: null, sort: 3 },
  { name: "Submit Knowledge", key: "create-task", parent: null, sort: 4 },
  { name: "Knowledge Base", key: "knowledge-feed", parent: null, sort: 5 },
  { name: "Recommended", key: "recommended", parent: null, sort: 6 },
  { name: "Bookmarks", key: "bookmarks", parent: null, sort: 7 },
  { name: "Knowledge Assistant", key: "ai-assistant", parent: null, sort: 8 },
  { name: "Notifications", key: "notifications", parent: null, sort: 9 },

  // Administrative / Elevated Features
  { name: "Dashboard", key: "dashboard", parent: null, sort: 10 },
  { name: "Approvals", key: "approvals_parent", parent: null, sort: 11 },
  { name: "Task Approval", key: "task_approval", parent: "Approvals", sort: 12 },
  { name: "File Reapproval", key: "task_reapproval", parent: "Approvals", sort: 13 },
  { name: "Site Settings", key: "site_settings", parent: null, sort: 14 },
  { name: "Manage Taxonomy", key: "manage_taxonomy", parent: null, sort: 15 },
  { name: "Departments", key: "taxonomy_departments", parent: "Manage Taxonomy", sort: 16 },
  { name: "Categories", key: "taxonomy_categories", parent: "Manage Taxonomy", sort: 17 },
  { name: "Add Knowledge Post", key: "add_knowledge_post_admin", parent: null, sort: 18 },
  { name: "Knowledge Base Delete", key: "knowledge_base_delete", parent: null, sort: 19 },
  { name: "Knowledge Recommendation", key: "knowledge_recommendation", parent: null, sort: 20 },
  { name: "Users", key: "users_full", parent: null, sort: 21 }
];

const DEFAULT_EMPLOYEE_PERMISSIONS = [
  "home",
  "tasks",
  "browse",
  "create-task",
  "knowledge-feed",
  "recommended",
  "bookmarks",
  "ai-assistant",
  "notifications"
];

async function initRoleManagementSchema() {
  const conn = await pool.getConnection();
  try {
    // 1. Ensure roles table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        role_name VARCHAR(100) NOT NULL DEFAULT '',
        description TEXT DEFAULT '',
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      await conn.query("ALTER TABLE roles ADD COLUMN IF NOT EXISTS role_name VARCHAR(100) NOT NULL DEFAULT '' AFTER name;");
    } catch (_) {}

    // 2. Ensure permissions table
    await conn.query(`
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
    `);

    try {
      await conn.query("ALTER TABLE permissions ADD COLUMN IF NOT EXISTS permission_name VARCHAR(100) NOT NULL UNIQUE AFTER id;");
    } catch (_) {}
    try {
      await conn.query("ALTER TABLE permissions ADD COLUMN IF NOT EXISTS permission_key VARCHAR(100) NOT NULL UNIQUE AFTER permission_name;");
    } catch (_) {}
    try {
      await conn.query("ALTER TABLE permissions ADD COLUMN IF NOT EXISTS parent_permission_id INT DEFAULT NULL AFTER permission_key;");
    } catch (_) {}
    try {
      await conn.query("ALTER TABLE permissions ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 AFTER parent_permission_id;");
    } catch (_) {}

    // 3. Ensure role_permissions table
    await conn.query(`
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
    `);

    // 4. Ensure role_id exists on users table
    try {
      await conn.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INT DEFAULT NULL;");
    } catch (_) {}

    // 5. Clean up obsolete permissions and populate required permissions
    const validPermKeys = REQUIRED_PERMISSIONS.map((p) => p.key);
    try {
      await conn.query("DELETE FROM permissions WHERE permission_key NOT IN (?)", [validPermKeys]);
    } catch (_) {}

    for (const item of REQUIRED_PERMISSIONS) {
      const [existing] = await conn.query(
        "SELECT id FROM permissions WHERE permission_key = ?",
        [item.key]
      );
      if (!existing || existing.length === 0) {
        await conn.query(
          "INSERT INTO permissions (permission_name, permission_key, module, menu, sort_order, created_at, updated_at) VALUES (?, ?, 'general', 'general', ?, NOW(), NOW())",
          [item.name, item.key, item.sort]
        );
      } else {
        await conn.query(
          "UPDATE permissions SET permission_name = ?, permission_key = ?, sort_order = ? WHERE id = ?",
          [item.name, item.key, item.sort, existing[0].id]
        );
      }
    }

    // 6. Update parent_permission_id relationships
    for (const item of REQUIRED_PERMISSIONS) {
      if (item.parent) {
        const [parentRows] = await conn.query(
          "SELECT id FROM permissions WHERE permission_name = ? LIMIT 1",
          [item.parent]
        );
        if (parentRows && parentRows.length > 0) {
          await conn.query(
            "UPDATE permissions SET parent_permission_id = ? WHERE permission_key = ?",
            [parentRows[0].id, item.key]
          );
        }
      } else {
        await conn.query(
          "UPDATE permissions SET parent_permission_id = NULL WHERE permission_key = ?",
          [item.key]
        );
      }
    }

    // 7. Ensure default "User" role exists
    const [userRoleRows] = await conn.query(
      "SELECT id FROM roles WHERE LOWER(name) = 'user' OR LOWER(role_name) = 'user' LIMIT 1"
    );
    let defaultUserRoleId = null;
    if (!userRoleRows || userRoleRows.length === 0) {
      const [newRole] = await conn.query(
        "INSERT INTO roles (name, role_name, description, status, created_at, updated_at) VALUES ('User', 'User', 'Standard user with regular portal access', 'active', NOW(), NOW())"
      );
      defaultUserRoleId = newRole.insertId;
      const [employeePerms] = await conn.query(
        "SELECT id FROM permissions WHERE permission_key IN (?)",
        [DEFAULT_EMPLOYEE_PERMISSIONS]
      );
      for (const p of employeePerms || []) {
        await conn.query(
          "INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by, created_at) VALUES (?, ?, 1, NOW())",
          [defaultUserRoleId, p.id]
        );
      }
    } else {
      defaultUserRoleId = userRoleRows[0].id;
    }

    // 8. Auto-assign "User" role to any existing non-admin users without a role_id
    if (defaultUserRoleId) {
      await conn.query(
        "UPDATE users SET role_id = ? WHERE role_id IS NULL AND role != 'admin'",
        [defaultUserRoleId]
      );
    }

    // 9. Ensure parent permission is granted if children are granted
    try {
      const [childRolePerms] = await conn.query(`
        SELECT DISTINCT rp.role_id, p.parent_permission_id
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE p.parent_permission_id IS NOT NULL
      `);
      for (const crp of childRolePerms || []) {
        await conn.query(
          "INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by, created_at) VALUES (?, ?, 1, NOW())",
          [crp.role_id, crp.parent_permission_id]
        );
      }
    } catch (_) {}
  } finally {
    conn.release();
  }
}

async function getPermissions() {
  const permKeys = REQUIRED_PERMISSIONS.map((p) => p.key);
  const [rows] = await pool.query(
    "SELECT id, permission_name, permission_key, parent_permission_id, sort_order FROM permissions WHERE permission_key IN (?) ORDER BY sort_order ASC, id ASC",
    [permKeys]
  );
  return rows;
}

async function getUserPermissions(userId) {
  const numericId = Number(userId);
  if (!numericId || isNaN(numericId)) return DEFAULT_EMPLOYEE_PERMISSIONS;

  const [userRows] = await pool.query("SELECT id, role, role_id FROM users WHERE id = ? LIMIT 1", [numericId]);
  if (!userRows || userRows.length === 0) return DEFAULT_EMPLOYEE_PERMISSIONS;

  const user = userRows[0];

  if (user.role === "admin") {
    return REQUIRED_PERMISSIONS.map((p) => p.key);
  }

  if (user.role_id) {
    const [permRows] = await pool.query(
      `SELECT p.permission_key
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       JOIN roles r ON rp.role_id = r.id
       WHERE rp.role_id = ? AND r.status = 'active'
       ORDER BY p.sort_order ASC, p.id ASC`,
      [user.role_id]
    );

    if (permRows && permRows.length > 0) {
      return permRows.map((p) => p.permission_key);
    }
  }

  return DEFAULT_EMPLOYEE_PERMISSIONS;
}

async function getRoles() {
  const [roleRows] = await pool.query(
    "SELECT id, COALESCE(NULLIF(role_name, ''), name) AS role_name, name, description, status, created_at, updated_at FROM roles ORDER BY id ASC"
  );

  if (roleRows.length === 0) {
    return [];
  }

  const roleIds = roleRows.map((r) => r.id);
  const [rpRows] = await pool.query(
    `SELECT rp.role_id, p.id AS permission_id, p.permission_name, p.permission_key, p.parent_permission_id, p.sort_order
     FROM role_permissions rp
     JOIN permissions p ON rp.permission_id = p.id
     WHERE rp.role_id IN (?)
     ORDER BY p.sort_order ASC, p.id ASC`,
    [roleIds]
  );

  const permissionsByRole = {};
  for (const rp of rpRows) {
    if (!permissionsByRole[rp.role_id]) {
      permissionsByRole[rp.role_id] = [];
    }
    permissionsByRole[rp.role_id].push({
      id: rp.permission_id,
      permission_name: rp.permission_name,
      parent_permission_id: rp.parent_permission_id
    });
  }

  return roleRows.map((r) => {
    const perms = permissionsByRole[r.id] || [];
    return {
      ...r,
      permissions: perms,
      attached_permissions: perms.map((p) => p.permission_name).join(", ")
    };
  });
}

async function createRole(roleName, permissionIds = [], grantedBy = 1) {
  const cleanName = (roleName || "").trim();

  if (!cleanName) {
    const err = new Error("Role name is required.");
    err.status = 400;
    throw err;
  }

  // Check duplicate role name
  const [existing] = await pool.query(
    "SELECT id FROM roles WHERE LOWER(name) = LOWER(?) OR LOWER(role_name) = LOWER(?) LIMIT 1",
    [cleanName, cleanName]
  );

  if (existing && existing.length > 0) {
    const err = new Error("Role already exists.");
    err.status = 409;
    throw err;
  }

  // Validate permission IDs if provided
  const numericPermIds = Array.isArray(permissionIds)
    ? permissionIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0)
    : [];

  let validPerms = [];
  if (numericPermIds.length > 0) {
    const [perms] = await pool.query(
      "SELECT id, permission_name, parent_permission_id, sort_order FROM permissions WHERE id IN (?) ORDER BY sort_order ASC, id ASC",
      [numericPermIds]
    );
    validPerms = perms || [];
  }

  // Find a fallback valid admin user ID if grantedBy is not valid in DB
  let adminUserId = Number(grantedBy);
  const [userCheck] = await pool.query("SELECT id FROM users WHERE id = ? LIMIT 1", [adminUserId]);
  if (!userCheck || userCheck.length === 0) {
    const [firstAdmin] = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    adminUserId = firstAdmin && firstAdmin.length > 0 ? firstAdmin[0].id : 1;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [roleInsert] = await conn.query(
      "INSERT INTO roles (name, role_name, description, status, created_at, updated_at) VALUES (?, ?, '', 'active', NOW(), NOW())",
      [cleanName, cleanName]
    );
    const roleId = roleInsert.insertId;

    for (const perm of validPerms) {
      await conn.query(
        "INSERT INTO role_permissions (role_id, permission_id, granted_by, created_at) VALUES (?, ?, ?, NOW())",
        [roleId, perm.id, adminUserId]
      );
    }

    await conn.commit();

    // Fetch and return the newly created role
    const [newRoleRows] = await conn.query(
      "SELECT id, COALESCE(NULLIF(role_name, ''), name) AS role_name, name, description, status, created_at, updated_at FROM roles WHERE id = ?",
      [roleId]
    );

    const createdRole = newRoleRows[0];
    createdRole.permissions = validPerms;
    createdRole.attached_permissions = validPerms.map((p) => p.permission_name).join(", ");

    return createdRole;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function updateRole(roleId, roleName, permissionIds, grantedBy = 1) {
  const numericRoleId = Number(roleId);
  if (!numericRoleId || isNaN(numericRoleId)) {
    const err = new Error("Invalid role ID.");
    err.status = 400;
    throw err;
  }

  const [currentRoleRows] = await pool.query(
    "SELECT id, COALESCE(NULLIF(role_name, ''), name) AS role_name FROM roles WHERE id = ?",
    [numericRoleId]
  );
  if (!currentRoleRows || currentRoleRows.length === 0) {
    const err = new Error("Role not found.");
    err.status = 404;
    throw err;
  }

  const cleanName = (roleName !== undefined ? roleName : currentRoleRows[0].role_name || "").trim();
  if (!cleanName) {
    const err = new Error("Role name cannot be empty.");
    err.status = 400;
    throw err;
  }

  // Check duplicate role name with other roles
  const [existing] = await pool.query(
    "SELECT id FROM roles WHERE (LOWER(name) = LOWER(?) OR LOWER(role_name) = LOWER(?)) AND id != ? LIMIT 1",
    [cleanName, cleanName, numericRoleId]
  );

  if (existing && existing.length > 0) {
    const err = new Error("Another role with this name already exists.");
    err.status = 409;
    throw err;
  }

  let validPerms = [];
  const shouldUpdatePerms = Array.isArray(permissionIds);

  if (shouldUpdatePerms) {
    const numericPermIds = permissionIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0);
    if (numericPermIds.length > 0) {
      const [perms] = await pool.query(
        "SELECT id, permission_name, parent_permission_id, sort_order FROM permissions WHERE id IN (?) ORDER BY sort_order ASC, id ASC",
        [numericPermIds]
      );
      validPerms = perms || [];
    }
  }

  let adminUserId = Number(grantedBy);
  const [userCheck] = await pool.query("SELECT id FROM users WHERE id = ? LIMIT 1", [adminUserId]);
  if (!userCheck || userCheck.length === 0) {
    const [firstAdmin] = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    adminUserId = firstAdmin && firstAdmin.length > 0 ? firstAdmin[0].id : 1;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      "UPDATE roles SET name = ?, role_name = ?, updated_at = NOW() WHERE id = ?",
      [cleanName, cleanName, numericRoleId]
    );

    if (shouldUpdatePerms) {
      await conn.query("DELETE FROM role_permissions WHERE role_id = ?", [numericRoleId]);

      for (const perm of validPerms) {
        await conn.query(
          "INSERT INTO role_permissions (role_id, permission_id, granted_by, created_at) VALUES (?, ?, ?, NOW())",
          [numericRoleId, perm.id, adminUserId]
        );
      }
    } else {
      const [existingPerms] = await conn.query(
        `SELECT p.id, p.permission_name, p.parent_permission_id, p.sort_order
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = ?
         ORDER BY p.sort_order ASC, p.id ASC`,
        [numericRoleId]
      );
      validPerms = existingPerms || [];
    }

    await conn.commit();

    const [updatedRoleRows] = await conn.query(
      "SELECT id, COALESCE(NULLIF(role_name, ''), name) AS role_name, name, description, status, created_at, updated_at FROM roles WHERE id = ?",
      [numericRoleId]
    );

    const updatedRole = updatedRoleRows[0];
    updatedRole.permissions = validPerms;
    updatedRole.attached_permissions = validPerms.map((p) => p.permission_name).join(", ");

    return updatedRole;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function deleteRole(roleId) {
  const numericId = Number(roleId);
  if (!numericId || isNaN(numericId)) {
    const err = new Error("Invalid role ID.");
    err.status = 400;
    throw err;
  }

  await pool.query("DELETE FROM roles WHERE id = ?", [numericId]);
  return { success: true };
}

async function getUserRoleAssignments() {
  const [rows] = await pool.query(`
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
  `);
  return rows;
}

async function assignRoleToUser(userId, roleId) {
  const numericUserId = Number(userId);
  if (!numericUserId || isNaN(numericUserId)) {
    const err = new Error("Invalid user ID.");
    err.status = 400;
    throw err;
  }

  let numericRoleId = roleId !== "" && roleId !== null && roleId !== undefined ? Number(roleId) : null;
  if (numericRoleId) {
    const [roleRows] = await pool.query("SELECT id, name, role_name FROM roles WHERE id = ?", [numericRoleId]);
    if (!roleRows || roleRows.length === 0) {
      const err = new Error("Selected role does not exist.");
      err.status = 404;
      throw err;
    }
  } else {
    numericRoleId = null;
  }

  await pool.query("UPDATE users SET role_id = ? WHERE id = ?", [numericRoleId, numericUserId]);

  const [userRows] = await pool.query(`
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
  `, [numericUserId]);

  return userRows[0];
}

module.exports = {
  REQUIRED_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  initRoleManagementSchema,
  getPermissions,
  getUserPermissions,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getUserRoleAssignments,
  assignRoleToUser
};
