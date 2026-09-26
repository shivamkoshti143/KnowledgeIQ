const { query, getOne, pool } = require("../db");

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

function toMySQLDate(value) {
  let d;
  if (!value) {
    d = new Date();
  } else if (value instanceof Date) {
    d = value;
  } else if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
      return value;
    }
    d = new Date(value);
  } else if (typeof value === "number") {
    d = new Date(value);
  } else {
    d = new Date();
  }

  if (isNaN(d.getTime())) {
    d = new Date();
  }

  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function initFileSchema() {
  try {
    const tfCols = await query("SHOW COLUMNS FROM task_files LIKE 'fileName'");
    if (!tfCols || !tfCols.length) {
      await query("ALTER TABLE task_files ADD COLUMN fileName VARCHAR(255) DEFAULT '' AFTER fileUrl");
    }
    const kpfCols = await query("SHOW COLUMNS FROM knowledge_post_files LIKE 'fileName'");
    if (!kpfCols || !kpfCols.length) {
      await query("ALTER TABLE knowledge_post_files ADD COLUMN fileName VARCHAR(255) DEFAULT '' AFTER fileUrl");
    }
    const vidCols = await query("SHOW COLUMNS FROM videos LIKE 'fileName'");
    if (!vidCols || !vidCols.length) {
      await query("ALTER TABLE videos ADD COLUMN fileName VARCHAR(255) DEFAULT '' AFTER videoUrl");
    }
  } catch (err) {
    console.error("Error initializing file schema:", err.message);
  }
}
initFileSchema().catch(() => {});

module.exports = {
  query,
  getOne,
  toMySQLDate,
  initFileSchema
};

async function getDepartments() {
  const rows = await query("SELECT * FROM departments ORDER BY name");
  return rows;
}

async function getDepartmentById(id) {
  return getOne("SELECT * FROM departments WHERE id = ?", [id]);
}

async function createDepartment(name, description = "") {
  const rows = await query("INSERT INTO departments (name, description) VALUES (?, ?)", [name, description]);
  return rows.insertId;
}

async function updateDepartment(id, name, description) {
  await query("UPDATE departments SET name = ?, description = ? WHERE id = ?", [name, description, id]);
}

async function deleteDepartment(id) {
  await query("UPDATE knowledge_posts SET departmentId = NULL WHERE departmentId = ?", [id]);
  await query("UPDATE tasks SET departmentId = NULL WHERE departmentId = ?", [id]);
  await query("UPDATE videos SET departmentId = NULL WHERE departmentId = ?", [id]);
  await query("UPDATE users SET departmentId = NULL WHERE departmentId = ?", [id]);
  await query("DELETE FROM departments WHERE id = ?", [id]);
}

async function getUsers() {
  try {
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at DATETIME DEFAULT NULL;");
  } catch (_) {}

  const rows = await query(`
    SELECT u.id, u.name, u.email, u.departmentId, u.title, u.status, u.role, u.role_id,
           COALESCE(u.last_active_at, (SELECT MAX(al.createdAt) FROM activity_logs al WHERE al.userId = u.id), u.createdAt) AS last_active_at,
           COALESCE(u.last_active_at, (SELECT MAX(al.createdAt) FROM activity_logs al WHERE al.userId = u.id), u.createdAt) AS lastActive,
           u.createdAt,
           d.name AS departmentName
    FROM users u
    LEFT JOIN departments d ON u.departmentId = d.id
    ORDER BY u.name
  `);
  return rows.map(sanitizeUser);
}

async function getUserById(id) {
  const user = await getOne(`
    SELECT u.*, d.name AS departmentName
    FROM users u
    LEFT JOIN departments d ON u.departmentId = d.id
    WHERE u.id = ?
  `, [id]);
  return sanitizeUser(user);
}

async function updateUser(id, patch) {
  const fields = [];
  const params = [];
  if (patch.role) { fields.push("role = ?"); params.push(patch.role); }
  if (patch.departmentId !== undefined) {
    fields.push("departmentId = ?");
    params.push(patch.departmentId ? Number(patch.departmentId) : null);
  }
  if (patch.status) { fields.push("status = ?"); params.push(patch.status); }
  if (fields.length > 0) {
    params.push(id);
    await query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, params);
  }
  return getUserById(id);
}

async function getUserByEmail(email) {
  const user = await getOne(`
    SELECT u.*, d.name AS departmentName
    FROM users u
    LEFT JOIN departments d ON u.departmentId = d.id
    WHERE u.email = ?
  `, [email]);
  return user;
}

async function createUser(name, email, passwordHash, role, departmentId, title = "", roleId = null) {
  let targetRoleId = roleId;
  if (!targetRoleId && role !== "admin") {
    try {
      const userRole = await getOne(
        "SELECT id FROM roles WHERE (LOWER(name) = 'user' OR LOWER(role_name) = 'user') AND status = 'active' LIMIT 1"
      );
      if (userRole && userRole.id) {
        targetRoleId = userRole.id;
      }
    } catch (_) {}
  }

  const rows = await query(
    "INSERT INTO users (name, email, passwordHash, role, departmentId, title, status, role_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [name, email, passwordHash || null, role, departmentId, title, "active", targetRoleId || null]
  );
  return rows.insertId;
}

async function getTags() {
  const rows = await query("SELECT * FROM tags ORDER BY name");
  return rows;
}

async function createTag(name) {
  const rows = await query("INSERT INTO tags (name) VALUES (?)", [name]);
  return rows.insertId;
}

async function deleteTag(id) {
  await query("DELETE FROM tags WHERE id = ?", [id]);
}

async function deleteCategory(id) {
  await query("UPDATE knowledge_posts SET categoryId = NULL WHERE categoryId = ?", [id]);
  await query("UPDATE tasks SET categoryId = NULL WHERE categoryId = ?", [id]);
  await query("UPDATE videos SET categoryId = NULL WHERE categoryId = ?", [id]);
  await query("DELETE FROM categories WHERE id = ?", [id]);
}

async function getCategories() {
  const rows = await query("SELECT * FROM categories ORDER BY name");
  return rows;
}

async function getCategoryById(id) {
  return getOne("SELECT * FROM categories WHERE id = ?", [id]);
}

async function getVideos(filters = {}) {
  const where = [];
  const params = [];
  if (filters.status) { where.push("v.status = ?"); params.push(filters.status); }
  if (filters.departmentId) { where.push("v.departmentId = ?"); params.push(filters.departmentId); }
  if (filters.categoryId) { where.push("v.categoryId = ?"); params.push(filters.categoryId); }
  if (filters.tag) { where.push("FIND_IN_SET(?, v.tags)"); params.push(filters.tag); }
  if (filters.q) { where.push("(v.title LIKE ? OR v.description LIKE ? OR v.tags LIKE ?)"); const q = `%${filters.q}%`; params.push(q, q, q); }
  const sql = `SELECT v.*, d.name AS departmentName, c.name AS categoryName, u.name AS uploaderName FROM videos v LEFT JOIN departments d ON v.departmentId = d.id LEFT JOIN categories c ON v.categoryId = c.id LEFT JOIN users u ON v.uploaderId = u.id ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY v.createdAt DESC`;
  const rows = await query(sql, params);
  return rows.map((row) => ({
    ...row,
    department: row.departmentName ? { id: row.departmentId, name: row.departmentName } : null,
    category: row.categoryName ? { id: row.categoryId, name: row.categoryName } : null,
    uploader: row.uploaderName ? { id: row.uploaderId, name: row.uploaderName } : null,
    tags: row.tags ? row.tags.split(",").map((t) => t.trim()) : []
  }));
}

async function getVideoById(id) {
  const video = await getOne("SELECT * FROM videos WHERE id = ?", [id]);
  if (!video) return null;
  const department = await getDepartmentById(video.departmentId);
  const category = await getCategoryById(video.categoryId);
  const uploader = await getUserById(video.uploaderId);
  return {
    ...video,
    tags: video.tags ? video.tags.split(",").map((t) => t.trim()) : [],
    department,
    category,
    uploader
  };
}

async function createVideo(data) {
  const tags = Array.isArray(data.tags) ? data.tags.join(",") : String(data.tags || "");
  const rows = await query(
    "INSERT INTO videos (title, description, departmentId, categoryId, uploaderId, tags, status, videoUrl, fileName, fileExtension, viewCount, duration, thumbnail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      data.title,
      data.description,
      data.departmentId,
      data.categoryId || null,
      data.uploaderId,
      tags,
      data.status || "pending",
      data.videoUrl || "",
      data.fileName || "",
      data.fileExtension || "",
      data.viewCount || 0,
      data.duration || "00:00",
      data.thumbnail || "upload"
    ]
  );
  return rows.insertId;
}

async function updateVideo(id, data) {
  const fields = [];
  const params = [];
  const allowed = ["title", "description", "departmentId", "categoryId", "tags", "status", "videoUrl", "fileName", "fileExtension", "viewCount", "duration", "thumbnail", "rejectionRemarks", "approvedBy", "approvedAt", "isRecommended"];
  allowed.forEach((key) => {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(key === "tags" && Array.isArray(data[key]) ? data[key].join(",") : data[key]);
    }
  });
  params.push(id);
  await query(`UPDATE videos SET ${fields.join(", ")} WHERE id = ?`, params);
}

async function getComments(filters = {}) {
  let sql = "SELECT c.*, u.name AS userName FROM comments c LEFT JOIN users u ON c.userId = u.id WHERE 1=1";
  const params = [];
  if (filters.videoId) { sql += " AND c.videoId = ?"; params.push(filters.videoId); }
  if (filters.taskId) { sql += " AND c.taskId = ?"; params.push(filters.taskId); }
  sql += " ORDER BY c.createdAt ASC";
  const rows = await query(sql, params);
  return rows.map((row) => ({ ...row, user: row.userName ? { id: row.userId, name: row.userName } : null }));
}

async function createComment(data) {
  const rows = await query(
    "INSERT INTO comments (videoId, taskId, userId, parentId, body, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
    [data.videoId || null, data.taskId || null, data.userId, data.parentId || null, data.body, toMySQLDate(data.createdAt)]
  );
  return rows.insertId;
}

async function getNotifications(userId) {
  const rows = await query("SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC", [userId]);
  return rows;
}

async function getTaskById(id) {
  const task = await getOne("SELECT * FROM tasks WHERE id = ?", [id]);
  if (!task) return null;
  const department = await getDepartmentById(task.departmentId);
  const category = await getCategoryById(task.categoryId);
  const uploader = await getUserById(task.uploaderId);
  const files = await query("SELECT * FROM task_files WHERE taskId = ? ORDER BY id ASC", [id]);
  return {
    ...task,
    tags: task.tags ? task.tags.split(",").map((t) => t.trim()) : [],
    department,
    category,
    uploader,
    files: files.map((row) => ({
      id: row.id,
      fileUrl: row.fileUrl,
      fileName: row.fileName || (row.fileUrl ? row.fileUrl.split("/").pop() : ""),
      fileExtension: row.fileExtension,
      approvalStatus: row.approvalStatus || "pending",
      adminRemarks: row.adminRemarks || null
    }))
  };
}

async function createTask(data) {
  const tags = Array.isArray(data.tags) ? data.tags.join(",") : String(data.tags || "");
  const rows = await query(
    "INSERT INTO tasks (title, description, departmentId, categoryId, uploaderId, fileUrl, fileExtension, status, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      data.title,
      data.description,
      data.departmentId,
      data.categoryId || null,
      data.uploaderId,
      data.fileUrl || "",
      data.fileExtension || "",
      data.status || "pending",
      tags
    ]
  );
  return rows.insertId;
}

async function deleteTask(id) {
  await query("DELETE FROM comments WHERE taskId = ? AND parentId IS NOT NULL", [id]);
  await query("DELETE FROM comments WHERE taskId = ?", [id]);
  await query("DELETE FROM bookmarks WHERE (contentType = 'task' OR contentType = 'knowledge') AND contentId = ?", [id]);
  await query("DELETE FROM notifications WHERE taskId = ? AND type != 'content_removed'", [id]);
  await query("DELETE FROM task_access WHERE taskId = ?", [id]);
  await query("DELETE FROM task_files WHERE taskId = ?", [id]);
  await query("DELETE FROM tasks WHERE id = ?", [id]);
}

async function createTaskFile(data) {
  const rows = await query(
    "INSERT INTO task_files (taskId, fileUrl, fileName, fileExtension) VALUES (?, ?, ?, ?)",
    [data.taskId, data.fileUrl || "", data.fileName || "", data.fileExtension || ""]
  );
  return rows.insertId;
}

async function updateTask(id, data) {
  const fields = [];
  const params = [];
  const allowed = ["title", "description", "departmentId", "categoryId", "uploaderId", "status", "isRecommended", "tags"];
  allowed.forEach((key) => {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  });
  if (!fields.length) return;
  params.push(id);
  await query(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`, params);
}

async function updateTaskFile(fileId, data) {
  const fields = [];
  const params = [];
  const allowed = ["fileUrl", "fileName", "fileExtension", "approvalStatus", "adminRemarks"];
  allowed.forEach((key) => {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  });
  if (!fields.length) return;
  params.push(fileId);
  await query(`UPDATE task_files SET ${fields.join(", ")} WHERE id = ?`, params);
}

async function getTaskFiles(taskId) {
  const rows = await query("SELECT * FROM task_files WHERE taskId = ? ORDER BY id ASC", [taskId]);
  return rows.map((row) => ({
    id: row.id,
    fileUrl: row.fileUrl,
    fileName: row.fileName || (row.fileUrl ? row.fileUrl.split("/").pop() : ""),
    fileExtension: row.fileExtension,
    approvalStatus: row.approvalStatus || "pending",
    adminRemarks: row.adminRemarks || null
  }));
}

async function getTasks(filters = {}) {
  const where = [];
  const params = [];
  if (filters.status) { where.push("t.status = ?"); params.push(filters.status); }
  if (filters.departmentId) { where.push("t.departmentId = ?"); params.push(filters.departmentId); }
  if (filters.q) { where.push("(t.title LIKE ? OR t.description LIKE ?)"); const q = `%${filters.q}%`; params.push(q, q); }
  const sql = `SELECT t.*, d.name AS departmentName, c.name AS categoryName, u.name AS uploaderName FROM tasks t LEFT JOIN departments d ON t.departmentId = d.id LEFT JOIN categories c ON t.categoryId = c.id LEFT JOIN users u ON t.uploaderId = u.id ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY t.createdAt DESC`;
  const rows = await query(sql, params);
  const tasks = rows.map((row) => ({
    ...row,
    department: row.departmentName ? { id: row.departmentId, name: row.departmentName } : null,
    category: row.categoryName ? { id: row.categoryId, name: row.categoryName } : null,
    uploader: row.uploaderName ? { id: row.uploaderId, name: row.uploaderName } : null,
    tags: row.tags ? row.tags.split(",").map((t) => t.trim()) : [],
    files: []
  }));
  if (!tasks.length) return tasks;
  const taskIds = tasks.map((t) => t.id);
  const placeholders = taskIds.map(() => "?").join(", ");
  const files = await query(`SELECT * FROM task_files WHERE taskId IN (${placeholders}) ORDER BY id ASC`, taskIds);
  const filesByTask = new Map();
  files.forEach((file) => {
    const list = filesByTask.get(file.taskId) || [];
    list.push({
      id: file.id,
      fileUrl: file.fileUrl,
      fileName: file.fileName || (file.fileUrl ? file.fileUrl.split("/").pop() : ""),
      fileExtension: file.fileExtension,
      approvalStatus: file.approvalStatus || "pending",
      adminRemarks: file.adminRemarks || null
    });
    filesByTask.set(file.taskId, list);
  });
  tasks.forEach((task) => {
    task.files = filesByTask.get(task.id) || [];
  });
  return tasks;
}

async function grantTaskAccess(taskId, userId, grantedBy) {
  const rows = await query("INSERT IGNORE INTO task_access (taskId, userId, grantedBy) VALUES (?, ?, ?)", [taskId, userId, grantedBy]);
  return rows.insertId;
}

async function revokeTaskAccess(taskId, userId) {
  await query("DELETE FROM task_access WHERE taskId = ? AND userId = ?", [taskId, userId]);
}

async function getTaskAccessUsers(taskId) {
  const rows = await query("SELECT ta.id, ta.taskId, ta.userId, u.name AS userName, u.email AS userEmail, g.name AS grantedByName FROM task_access ta LEFT JOIN users u ON ta.userId = u.id LEFT JOIN users g ON ta.grantedBy = g.id WHERE ta.taskId = ? ORDER BY u.name ASC", [taskId]);
  return rows;
}

async function getUserTaskAccess(userId) {
  const rows = await query("SELECT ta.id, ta.taskId, t.title AS taskTitle FROM task_access ta LEFT JOIN tasks t ON ta.taskId = t.id WHERE ta.userId = ? ORDER BY t.title ASC", [userId]);
  return rows;
}

async function hasTaskAccess(userId, taskId) {
  const task = await getTaskById(taskId);
  if (!task) return false;
  if (task.uploaderId === userId) return true;
  const row = await getOne("SELECT id FROM task_access WHERE taskId = ? AND userId = ? LIMIT 1", [taskId, userId]);
  return !!row;
}



async function createNotification(data) {
  const rows = await query(
    "INSERT INTO notifications (userId, type, message, videoId, taskId, commentId, readAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      data.userId,
      data.type,
      data.message,
      data.videoId || null,
      data.taskId || null,
      data.commentId || null,
      data.readAt || null,
      toMySQLDate(data.createdAt)
    ]
  );
  return rows.insertId;
}

async function getNextId(table) {
  const result = await getOne("SELECT MAX(id) AS maxId FROM ??", [table]);
  return (result.maxId || 0) + 1;
}

async function seedData() {
  const existingUsers = await query("SELECT COUNT(*) AS count FROM users");
  if (existingUsers[0].count > 0) return;

  await query(
    "INSERT INTO users (name, email, passwordHash, role, departmentId, title, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["Karthik", "karthik@abmindia.com", null, "employee", 1, "Developer", "active"]
  );
  await query(
    "INSERT INTO users (name, email, passwordHash, role, departmentId, title, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["Priya S", "priya@abmindia.com", null, "employee", 3, "SQA Lead", "active"]
  );
  await query(
    "INSERT INTO users (name, email, passwordHash, role, departmentId, title, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["Admin", "admin@abmindia.com", null, "admin", null, "Platform Admin", "active"]
  );
  await query(
    "INSERT INTO users (name, email, passwordHash, role, departmentId, title, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["Arjun M", "arjun@abmindia.com", null, "employee", 2, "IT Analyst", "active"]
  );

  await query("INSERT IGNORE INTO departments (name, description) VALUES (?, ?)", ["Developer", "Engineering guides and app delivery practices"]);
  await query("INSERT IGNORE INTO departments (name, description) VALUES (?, ?)", ["IT", "Infrastructure, access, and helpdesk operations"]);
  await query("INSERT IGNORE INTO departments (name, description) VALUES (?, ?)", ["SQA", "Software quality assurance playbooks"]);
  await query("INSERT IGNORE INTO departments (name, description) VALUES (?, ?)", ["Testers", "Manual and automation testing guidance"]);
  await query("INSERT IGNORE INTO departments (name, description) VALUES (?, ?)", ["HR", "People operations and employee services"]);

  await query("INSERT IGNORE INTO tags (name) VALUES (?)", ["react"]);
  await query("INSERT IGNORE INTO tags (name) VALUES (?)", ["javascript"]);
  await query("INSERT IGNORE INTO tags (name) VALUES (?)", ["docker"]);
  await query("INSERT IGNORE INTO tags (name) VALUES (?)", ["api"]);
  await query("INSERT IGNORE INTO tags (name) VALUES (?)", ["sql"]);
  await query("INSERT IGNORE INTO tags (name) VALUES (?)", ["workflow"]);
  await query("INSERT IGNORE INTO tags (name) VALUES (?)", ["onboarding"]);

  await query("INSERT IGNORE INTO categories (name) VALUES (?)", ["Walkthrough"]);
  await query("INSERT IGNORE INTO categories (name) VALUES (?, ?)", ["Playbook"]);
  await query("INSERT IGNORE INTO categories (name) VALUES (?)", ["Demo"]);
  await query("INSERT IGNORE INTO categories (name) VALUES (?)", ["Reference"]);
  await query("INSERT IGNORE INTO categories (name) VALUES (?)", ["Onboarding"]);
  await query("INSERT IGNORE INTO categories (name) VALUES (?)", ["Best Practices"]);
  await query("INSERT IGNORE INTO categories (name) VALUES (?)", ["How-to Guide"]);
  await query("INSERT IGNORE INTO categories (name) VALUES (?)", ["Case Study"]);
  await query("INSERT IGNORE INTO categories (name) VALUES (?)", ["Checklist"]);
  await query("INSERT IGNORE INTO categories (name) VALUES (?)", ["Policy"]);

  const now = toMySQLDate();
  await query(
    "INSERT INTO videos (title, description, departmentId, categoryId, uploaderId, tags, status, viewCount, duration, thumbnail, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ["React JS Complete Tutorial for Beginners", "Starter walkthrough for components, props, hooks, and project structure.", 1, 1, 1, "react,javascript", "approved", 1234, "18:45", "react", "2026-07-03 09:00:00"]
  );
  await query(
    "INSERT INTO videos (title, description, departmentId, categoryId, uploaderId, tags, status, viewCount, duration, thumbnail, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ["Docker Deployment Checklist", "Production container checks, image tagging, and rollback basics.", 1, 3, 4, "docker,deployment", "pending", 0, "14:10", "docker", "2026-07-17 10:00:00"]
  );
  await query(
    "INSERT INTO videos (title, description, departmentId, categoryId, uploaderId, tags, status, viewCount, duration, thumbnail, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ["API Testing Using Postman", "SQA request collections, environments, and assertions.", 3, 1, 2, "api,testing", "approved", 987, "12:30", "api", "2026-06-30 13:00:00"]
  );
  await query(
    "INSERT INTO videos (title, description, departmentId, categoryId, uploaderId, tags, status, viewCount, duration, thumbnail, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ["SQL Joins Explained with Examples", "Inner, left, right, and full joins using workplace examples.", 1, 1, 4, "sql,database", "approved", 756, "15:20", "sql", "2026-07-14 11:30:00"]
  );
  await query(
    "INSERT INTO videos (title, description, departmentId, categoryId, uploaderId, tags, status, rejectionRemarks, viewCount, duration, thumbnail, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ["New Hire Onboarding Checklist", "HR checklist for joining formalities and access setup.", 5, 2, 2, "onboarding,hr", "rejected", "Please blur personal information in the demo form.", 0, "09:30", "hr", "2026-07-15 08:15:00"]
  );

  await query(
    "INSERT INTO comments (videoId, userId, parentId, body, createdAt) VALUES (?, ?, ?, ?, ?)",
    [1, 4, null, "How do I pass data from a parent to a child component in React?", "2026-07-17 10:30:00"]
  );
  await query(
    "INSERT INTO comments (videoId, userId, parentId, body, createdAt) VALUES (?, ?, ?, ?, ?)",
    [1, 1, 1, "Use props for the first version. If the data becomes shared across distant components, then consider context.", "2026-07-17 11:15:00"]
  );
  await query(
    "INSERT INTO comments (videoId, userId, parentId, body, createdAt) VALUES (?, ?, ?, ?, ?)",
    [3, 1, null, "What is the best way to store reusable auth headers?", "2026-07-16 14:10:00"]
  );

  await query("INSERT INTO tasks (title, description, departmentId, categoryId, uploaderId, fileUrl, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ["Fix login redirect bug", "After login, employee users are not redirecting to their department-specific dashboard.", 1, 4, 1, "", "pending", "2026-07-18 08:00:00"]);
  await query("INSERT INTO tasks (title, description, departmentId, categoryId, uploaderId, fileUrl, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ["Update API documentation", "The Postman collection needs updated endpoints for v2.", 2, 3, 4, "/uploads/sample-doc.pdf", "approved", "2026-07-17 09:00:00"]);
  await query("INSERT INTO tasks (title, description, departmentId, categoryId, uploaderId, fileUrl, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ["Add unit tests for auth flow", "Missing coverage on login, signup, and token refresh logic.", 3, 5, 2, "", "pending", "2026-07-16 14:00:00"]);

  await query("INSERT INTO notifications (userId, type, message, videoId, readAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
    [1, "video_approved", 'Your video "React JS Complete Tutorial" has been approved.', 1, null, "2026-07-17 09:15:00"]);
  await query("INSERT INTO notifications (userId, type, message, videoId, commentId, readAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [4, "reply", "Karthik replied to your question.", 1, 2, null, "2026-07-17 11:15:00"]);
  await query("INSERT INTO notifications (userId, type, message, videoId, readAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
    [2, "approval_queue", "Docker Deployment Checklist is waiting for review.", 2, null, "2026-07-17 10:00:00"]);
  await query("INSERT INTO notifications (userId, type, message, videoId, readAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
    [1, "video_rejected", 'Your video "React JS" has been rejected.', 5, null, "2026-07-17 09:15:00"]);
}

async function getSiteSettings() {
  const rows = await query("SELECT portalName, logoUrl, faviconUrl FROM site_settings LIMIT 1");
  return rows[0] || { portalName: "TaskIQ", logoUrl: "", faviconUrl: "" };
}

async function updateSiteSettings(data) {
  await query(
    "UPDATE site_settings SET portalName = COALESCE(?, portalName), logoUrl = COALESCE(?, logoUrl), faviconUrl = COALESCE(?, faviconUrl)",
    [data.portalName || null, data.logoUrl || null, data.faviconUrl || null]
  );
  return getSiteSettings();
}

async function getKnowledgePosts(filters = {}) {
  const where = [];
  const params = [];
  if (filters.status) { where.push("k.status = ?"); params.push(filters.status); }
  if (filters.departmentId) { where.push("k.departmentId = ?"); params.push(filters.departmentId); }
  if (filters.categoryId) { where.push("k.categoryId = ?"); params.push(filters.categoryId); }
  if (filters.q) { where.push("(k.title LIKE ? OR k.description LIKE ?)"); const q = `%${filters.q}%`; params.push(q, q); }
  const sql = `SELECT k.*, d.name AS departmentName, c.name AS categoryName, u.name AS uploaderName FROM knowledge_posts k LEFT JOIN departments d ON k.departmentId = d.id LEFT JOIN categories c ON k.categoryId = c.id LEFT JOIN users u ON k.uploaderId = u.id ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY k.createdAt DESC`;
  const rows = await query(sql, params);
  const posts = rows.map((row) => ({
    ...row,
    department: row.departmentName ? { id: row.departmentId, name: row.departmentName } : null,
    category: row.categoryName ? { id: row.categoryId, name: row.categoryName } : null,
    uploader: row.uploaderName ? { id: row.uploaderId, name: row.uploaderName } : null,
    tags: row.tags ? row.tags.split(",").map((t) => t.trim()) : [],
    files: []
  }));
  if (!posts.length) return posts;
  const postIds = posts.map((p) => p.id);
  const placeholders = postIds.map(() => "?").join(", ");
  const files = await query(`SELECT * FROM knowledge_post_files WHERE knowledgePostId IN (${placeholders}) ORDER BY id ASC`, postIds);
  const filesByPost = new Map();
  files.forEach((file) => {
    const list = filesByPost.get(file.knowledgePostId) || [];
    list.push({
      id: file.id,
      fileUrl: file.fileUrl,
      fileName: file.fileName || (file.fileUrl ? file.fileUrl.split("/").pop() : ""),
      fileExtension: file.fileExtension,
      approvalStatus: file.approvalStatus || "pending",
      adminRemarks: file.adminRemarks || null
    });
    filesByPost.set(file.knowledgePostId, list);
  });
  posts.forEach((post) => {
    post.files = filesByPost.get(post.id) || [];
  });
  return posts;
}

async function getKnowledgePostById(id) {
  const post = await getOne("SELECT * FROM knowledge_posts WHERE id = ?", [id]);
  if (!post) return null;
  const department = post.departmentId ? await getDepartmentById(post.departmentId) : null;
  const category = post.categoryId ? await getCategoryById(post.categoryId) : null;
  const uploader = await getUserById(post.uploaderId);
  const files = await query("SELECT * FROM knowledge_post_files WHERE knowledgePostId = ? ORDER BY id ASC", [id]);
  return {
    ...post,
    department,
    category,
    uploader,
    tags: post.tags ? post.tags.split(",").map((t) => t.trim()) : [],
    files: files.map((row) => ({
      id: row.id,
      fileUrl: row.fileUrl,
      fileName: row.fileName || (row.fileUrl ? row.fileUrl.split("/").pop() : ""),
      fileExtension: row.fileExtension,
      approvalStatus: row.approvalStatus || "pending",
      adminRemarks: row.adminRemarks || null
    }))
  };
}

async function createKnowledgePost(data) {
  const tags = Array.isArray(data.tags) ? data.tags.join(",") : String(data.tags || "").trim();
  const rows = await query(
    "INSERT INTO knowledge_posts (title, description, tags, contentType, fileUrl, fileExtension, categoryId, departmentId, uploaderId, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      data.title,
      data.description || "",
      tags,
      data.contentType || "text",
      data.fileUrl || "",
      data.fileExtension || "",
      data.categoryId || null,
      data.departmentId || null,
      data.uploaderId,
      data.status || "published"
    ]
  );
  return rows.insertId;
}

async function updateKnowledgePost(id, data) {
  const fields = [];
  const params = [];
  const allowed = ["title", "description", "tags", "contentType", "fileUrl", "fileExtension", "categoryId", "departmentId", "status", "isRecommended"];
  allowed.forEach((key) => {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      const value = key === "tags" && Array.isArray(data[key]) ? data[key].join(",") : data[key];
      params.push(data[key] === "" && key !== "description" ? "" : value);
    }
  });
  if (!fields.length) return;
  params.push(id);
  await query(`UPDATE knowledge_posts SET ${fields.join(", ")} WHERE id = ?`, params);
}

async function deleteKnowledgePost(id) {
  await query("DELETE FROM bookmarks WHERE contentType = 'knowledge' AND contentId = ?", [id]);
  await query("DELETE FROM knowledge_post_files WHERE knowledgePostId = ?", [id]);
  await query("DELETE FROM knowledge_posts WHERE id = ?", [id]);
}

async function createKnowledgePostFile(data) {
  const rows = await query(
    "INSERT INTO knowledge_post_files (knowledgePostId, fileUrl, fileName, fileExtension) VALUES (?, ?, ?, ?)",
    [data.knowledgePostId, data.fileUrl || "", data.fileName || "", data.fileExtension || ""]
  );
  return rows.insertId;
}

async function updateKnowledgePostFile(fileId, data) {
  const fields = [];
  const params = [];
  const allowed = ["fileUrl", "fileName", "fileExtension", "approvalStatus", "adminRemarks"];
  allowed.forEach((key) => {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  });
  if (!fields.length) return;
  params.push(fileId);
  await query(`UPDATE knowledge_post_files SET ${fields.join(", ")} WHERE id = ?`, params);
}

async function getKnowledgePostFiles(knowledgePostId) {
  const rows = await query("SELECT * FROM knowledge_post_files WHERE knowledgePostId = ? ORDER BY id ASC", [knowledgePostId]);
  return rows.map((row) => ({
    id: row.id,
    fileUrl: row.fileUrl,
    fileName: row.fileName || (row.fileUrl ? row.fileUrl.split("/").pop() : ""),
    fileExtension: row.fileExtension,
    approvalStatus: row.approvalStatus || "pending",
    adminRemarks: row.adminRemarks || null
  }));
}

async function createBookmark(userId, contentType, contentId) {
  const rows = await query("INSERT IGNORE INTO bookmarks (userId, contentType, contentId) VALUES (?, ?, ?)", [userId, contentType, contentId]);
  return rows.insertId;
}

async function deleteBookmark(userId, contentType, contentId) {
  await query("DELETE FROM bookmarks WHERE userId = ? AND contentType = ? AND contentId = ?", [userId, contentType, contentId]);
}

async function getUserBookmarks(userId) {
  const rows = await query("SELECT * FROM bookmarks WHERE userId = ? ORDER BY createdAt DESC", [userId]);
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    contentType: row.contentType,
    contentId: row.contentId,
    createdAt: row.createdAt
  }));
}

async function isBookmarked(userId, contentType, contentId) {
  const row = await getOne("SELECT id FROM bookmarks WHERE userId = ? AND contentType = ? AND contentId = ?", [userId, contentType, contentId]);
  return Boolean(row);
}

async function getRecommendedContent() {
  const videos = await getVideos({ status: "approved" });
  const tasks = await getTasks({ status: "approved" });
  const knowledgePosts = await getKnowledgePosts({ status: "published" });
  return {
    videos: videos.filter((v) => v.isRecommended),
    tasks: tasks.filter((t) => t.isRecommended),
    knowledgePosts: knowledgePosts.filter((k) => k.isRecommended)
  };
}

async function createAiChat(data) {
  const rows = await query(
    "INSERT INTO ai_chats (userId, message, response, model) VALUES (?, ?, ?, ?)",
    [data.userId, data.message, data.response, data.model || "openrouter/free"]
  );
  return rows.insertId;
}

async function getAiChatsByUser(userId) {
  const rows = await query("SELECT * FROM ai_chats WHERE userId = ? ORDER BY id DESC LIMIT 200", [userId]);
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    message: row.message,
    response: row.response,
    model: row.model,
    createdAt: row.createdAt
  }));
}

async function getAiChatsByUsers(userIds) {
  if (!userIds.length) return [];
  const placeholders = userIds.map(() => "?").join(", ");
  const rows = await query(`SELECT * FROM ai_chats WHERE userId IN (${placeholders}) ORDER BY id DESC LIMIT 500`, userIds);
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    message: row.message,
    response: row.response,
    model: row.model,
    createdAt: row.createdAt
  }));
}

async function createOtp(email, otp, purpose, metadata, expiresInMinutes = 10) {
  await query("INSERT INTO otps (email, otp, purpose, metadata, expiresAt) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))", [
    email,
    otp,
    purpose,
    metadata ? JSON.stringify(metadata) : null,
    expiresInMinutes
  ]);
}

async function getValidOtp(email, otp, purpose) {
  const row = await getOne("SELECT * FROM otps WHERE email = ? AND otp = ? AND purpose = ? AND expiresAt > NOW() ORDER BY id DESC LIMIT 1", [
    email,
    otp,
    purpose
  ]);
  return row;
}

async function deleteOtp(id) {
  await query("DELETE FROM otps WHERE id = ?", [id]);
}

async function deleteExpiredOtps() {
  await query("DELETE FROM otps WHERE expiresAt <= NOW()");
}

async function createActivityLog(userId, route, method, userAgent, ipAddress) {
  await query("INSERT INTO activity_logs (userId, route, method, userAgent, ipAddress) VALUES (?, ?, ?, ?, ?)", [
    userId,
    route,
    method,
    userAgent || null,
    ipAddress || null
  ]);
}

async function getActivityLogsByUser(userId, limit = 100) {
  const rows = await query("SELECT * FROM activity_logs WHERE userId = ? ORDER BY createdAt DESC LIMIT ?", [userId, limit]);
  return rows;
}

async function getRecentActivityLogs(limit = 200) {
  const rows = await query("SELECT al.*, u.name AS userName, u.email AS userEmail FROM activity_logs al LEFT JOIN users u ON al.userId = u.id ORDER BY al.createdAt DESC LIMIT ?", [limit]);
  return rows;
}

module.exports = {
  pool,
  query,
  getOne,
  sanitizeUser,
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getUsers,
  getUserById,
  updateUser,
  getUserByEmail,
  createUser,
  getTags,
  createTag,
  deleteTag,
  getCategories,
  getCategoryById,
  deleteCategory,
  getVideos,
  getVideoById,
  createVideo,
  updateVideo,
  getComments,
  createComment,
  getNotifications,
  getTasks,
  getTaskById,
  createTask,
  createTaskFile,
  updateTaskFile,
  deleteTask,
  getTaskFiles,
  createNotification,
  getSiteSettings,
  updateSiteSettings,
  getKnowledgePosts,
  getKnowledgePostById,
  createKnowledgePost,
  updateKnowledgePost,
  deleteKnowledgePost,
  createKnowledgePostFile,
  updateKnowledgePostFile,
  getKnowledgePostFiles,
  createBookmark,
  deleteBookmark,
  getUserBookmarks,
  isBookmarked,
  updateTask,
  getRecommendedContent,
  createAiChat,
  getAiChatsByUser,
  getAiChatsByUsers,
  createOtp,
  getValidOtp,
  deleteOtp,
  deleteExpiredOtps,
  createActivityLog,
  getActivityLogsByUser,
  getRecentActivityLogs,
  grantTaskAccess,
  revokeTaskAccess,
  getTaskAccessUsers,
  getUserTaskAccess,
  hasTaskAccess,
  seedData
};
