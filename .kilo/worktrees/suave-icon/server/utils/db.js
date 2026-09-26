const bcrypt = require("bcryptjs");
const { query, getOne, pool } = require("../db");

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

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
  const rows = await query("SELECT * FROM users ORDER BY name");
  return rows.map(sanitizeUser);
}

async function getUserById(id) {
  const user = await getOne("SELECT * FROM users WHERE id = ?", [id]);
  return sanitizeUser(user);
}

async function updateUser(id, patch) {
  const fields = [];
  const params = [];
  if (patch.role) { fields.push("role = ?"); params.push(patch.role); }
  if (patch.departmentId) { fields.push("departmentId = ?"); params.push(patch.departmentId); }
  if (patch.status) { fields.push("status = ?"); params.push(patch.status); }
  params.push(id);
  await query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, params);
  return getUserById(id);
}

async function getUserByEmail(email) {
  const user = await getOne("SELECT * FROM users WHERE email = ?", [email]);
  return user;
}

async function createUser(name, email, passwordHash, role, departmentId, title = "") {
  const rows = await query(
    "INSERT INTO users (name, email, passwordHash, role, departmentId, title, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [name, email, passwordHash, role, departmentId, title, "active"]
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
    "INSERT INTO videos (title, description, departmentId, categoryId, uploaderId, tags, status, videoUrl, fileExtension, viewCount, duration, thumbnail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      data.title,
      data.description,
      data.departmentId,
      data.categoryId || null,
      data.uploaderId,
      tags,
      data.status || "pending",
      data.videoUrl || "",
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
  const allowed = ["title", "description", "departmentId", "categoryId", "tags", "status", "videoUrl", "fileExtension", "viewCount", "duration", "thumbnail", "rejectionRemarks", "approvedBy", "approvedAt", "isRecommended"];
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
    [data.videoId || null, data.taskId || null, data.userId, data.parentId || null, data.body, data.createdAt || new Date().toISOString()]
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
    department,
    category,
    uploader,
    files: files.map((row) => ({
      id: row.id,
      fileUrl: row.fileUrl,
      fileExtension: row.fileExtension
    }))
  };
}

async function createTask(data) {
  const rows = await query(
    "INSERT INTO tasks (title, description, departmentId, categoryId, uploaderId, fileUrl, fileExtension, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      data.title,
      data.description,
      data.departmentId,
      data.categoryId || null,
      data.uploaderId,
      data.fileUrl || "",
      data.fileExtension || "",
      data.status || "pending"
    ]
  );
  return rows.insertId;
}

async function createTaskFile(data) {
  const rows = await query(
    "INSERT INTO task_files (taskId, fileUrl, fileExtension) VALUES (?, ?, ?)",
    [data.taskId, data.fileUrl || "", data.fileExtension || ""]
  );
  return rows.insertId;
}

async function updateTask(id, data) {
  const fields = [];
  const params = [];
  const allowed = ["title", "description", "departmentId", "categoryId", "uploaderId", "status", "isRecommended"];
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

async function getTaskFiles(taskId) {
  const rows = await query("SELECT * FROM task_files WHERE taskId = ? ORDER BY id ASC", [taskId]);
  return rows.map((row) => ({
    id: row.id,
    fileUrl: row.fileUrl,
    fileExtension: row.fileExtension
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
      fileExtension: file.fileExtension
    });
    filesByTask.set(file.taskId, list);
  });
  tasks.forEach((task) => {
    task.files = filesByTask.get(task.id) || [];
  });
  return tasks;
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
      data.createdAt || new Date().toISOString()
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

  const passwordHash = bcrypt.hashSync("password123", 8);
  const adminHash = bcrypt.hashSync("admin123", 8);

  await query(
    "INSERT INTO users (name, email, passwordHash, role, departmentId, title, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["Karthik", "karthik@abm.com", passwordHash, "employee", 1, "Developer", "active"]
  );
  await query(
    "INSERT INTO users (name, email, passwordHash, role, departmentId, title, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["Priya S", "priya@abm.com", passwordHash, "employee", 3, "SQA Lead", "active"]
  );
  await query(
    "INSERT INTO users (name, email, passwordHash, role, departmentId, title, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["Admin User", "admin@abm.com", adminHash, "admin", 2, "Platform Admin", "active"]
  );
  await query(
    "INSERT INTO users (name, email, passwordHash, role, departmentId, title, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["Arjun M", "arjun@abm.com", passwordHash, "employee", 2, "IT Analyst", "active"]
  );

  await query("INSERT INTO departments (name, description) VALUES (?, ?)", ["Developer", "Engineering guides and app delivery practices"]);
  await query("INSERT INTO departments (name, description) VALUES (?, ?)", ["IT", "Infrastructure, access, and helpdesk operations"]);
  await query("INSERT INTO departments (name, description) VALUES (?, ?)", ["SQA", "Software quality assurance playbooks"]);
  await query("INSERT INTO departments (name, description) VALUES (?, ?)", ["Testers", "Manual and automation testing guidance"]);
  await query("INSERT INTO departments (name, description) VALUES (?, ?)", ["HR", "People operations and employee services"]);

  await query("INSERT INTO tags (name) VALUES (?)", ["react"]);
  await query("INSERT INTO tags (name) VALUES (?)", ["javascript"]);
  await query("INSERT INTO tags (name) VALUES (?)", ["docker"]);
  await query("INSERT INTO tags (name) VALUES (?)", ["api"]);
  await query("INSERT INTO tags (name) VALUES (?)", ["sql"]);
  await query("INSERT INTO tags (name) VALUES (?)", ["workflow"]);
  await query("INSERT INTO tags (name) VALUES (?)", ["onboarding"]);

  await query("INSERT INTO categories (name) VALUES (?)", ["Tutorial"]);
  await query("INSERT INTO categories (name) VALUES (?)", ["Task"]);
  await query("INSERT INTO categories (name) VALUES (?)", ["Documentation"]);
  await query("INSERT INTO categories (name) VALUES (?)", ["Bug Report"]);
  await query("INSERT INTO categories (name) VALUES (?)", ["Feature Request"]);

  const now = new Date().toISOString();
  await query(
    "INSERT INTO videos (title, description, departmentId, categoryId, uploaderId, tags, status, viewCount, duration, thumbnail, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ["React JS Complete Tutorial for Beginners", "Starter walkthrough for components, props, hooks, and project structure.", 1, 1, 1, "react,javascript", "approved", 1234, "18:45", "react", "2026-07-03T09:00:00.000Z"]
  );
  await query(
    "INSERT INTO videos (title, description, departmentId, categoryId, uploaderId, tags, status, viewCount, duration, thumbnail, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ["Docker Deployment Checklist", "Production container checks, image tagging, and rollback basics.", 1, 3, 4, "docker,deployment", "pending", 0, "14:10", "docker", "2026-07-17T10:00:00.000Z"]
  );
  await query(
    "INSERT INTO videos (title, description, departmentId, categoryId, uploaderId, tags, status, viewCount, duration, thumbnail, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ["API Testing Using Postman", "SQA request collections, environments, and assertions.", 3, 1, 2, "api,testing", "approved", 987, "12:30", "api", "2026-06-30T13:00:00.000Z"]
  );
  await query(
    "INSERT INTO videos (title, description, departmentId, categoryId, uploaderId, tags, status, viewCount, duration, thumbnail, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ["SQL Joins Explained with Examples", "Inner, left, right, and full joins using workplace examples.", 1, 1, 4, "sql,database", "approved", 756, "15:20", "sql", "2026-07-14T11:30:00.000Z"]
  );
  await query(
    "INSERT INTO videos (title, description, departmentId, categoryId, uploaderId, tags, status, rejectionRemarks, viewCount, duration, thumbnail, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ["New Hire Onboarding Checklist", "HR checklist for joining formalities and access setup.", 5, 2, 2, "onboarding,hr", "rejected", "Please blur personal information in the demo form.", 0, "09:30", "hr", "2026-07-15T08:15:00.000Z"]
  );

  await query(
    "INSERT INTO comments (videoId, userId, parentId, body, createdAt) VALUES (?, ?, ?, ?, ?)",
    [1, 4, null, "How do I pass data from a parent to a child component in React?", "2026-07-17T10:30:00.000Z"]
  );
  await query(
    "INSERT INTO comments (videoId, userId, parentId, body, createdAt) VALUES (?, ?, ?, ?, ?)",
    [1, 1, 1, "Use props for the first version. If the data becomes shared across distant components, then consider context.", "2026-07-17T11:15:00.000Z"]
  );
  await query(
    "INSERT INTO comments (videoId, userId, parentId, body, createdAt) VALUES (?, ?, ?, ?, ?)",
    [3, 1, null, "What is the best way to store reusable auth headers?", "2026-07-16T14:10:00.000Z"]
  );

  await query("INSERT INTO tasks (title, description, departmentId, categoryId, uploaderId, fileUrl, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ["Fix login redirect bug", "After login, employee users are not redirecting to their department-specific dashboard.", 1, 4, 1, "", "pending", "2026-07-18T08:00:00.000Z"]);
  await query("INSERT INTO tasks (title, description, departmentId, categoryId, uploaderId, fileUrl, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ["Update API documentation", "The Postman collection needs updated endpoints for v2.", 2, 3, 4, "/uploads/sample-doc.pdf", "approved", "2026-07-17T09:00:00.000Z"]);
  await query("INSERT INTO tasks (title, description, departmentId, categoryId, uploaderId, fileUrl, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ["Add unit tests for auth flow", "Missing coverage on login, signup, and token refresh logic.", 3, 5, 2, "", "pending", "2026-07-16T14:00:00.000Z"]);

  await query("INSERT INTO notifications (userId, type, message, videoId, readAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
    [1, "video_approved", 'Your video "React JS Complete Tutorial" has been approved.', 1, null, "2026-07-17T09:15:00.000Z"]);
  await query("INSERT INTO notifications (userId, type, message, videoId, commentId, readAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [4, "reply", "Karthik replied to your question.", 1, 2, null, "2026-07-17T11:15:00.000Z"]);
  await query("INSERT INTO notifications (userId, type, message, videoId, readAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
    [2, "approval_queue", "Docker Deployment Checklist is waiting for review.", 2, null, "2026-07-17T10:00:00.000Z"]);
  await query("INSERT INTO notifications (userId, type, message, videoId, readAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
    [1, "video_rejected", 'Your video "React JS" has been rejected.', 5, null, "2026-07-17T09:15:00.000Z"]);
}

async function getSiteSettings() {
  const rows = await query("SELECT portalName, logoUrl, faviconUrl FROM site_settings LIMIT 1");
  return rows[0] || { portalName: "ABM TaskIQ", logoUrl: "", faviconUrl: "" };
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
      fileExtension: file.fileExtension
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
      fileExtension: row.fileExtension
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
  await query("DELETE FROM knowledge_posts WHERE id = ?", [id]);
}

async function createKnowledgePostFile(data) {
  const rows = await query(
    "INSERT INTO knowledge_post_files (knowledgePostId, fileUrl, fileExtension) VALUES (?, ?, ?)",
    [data.knowledgePostId, data.fileUrl || "", data.fileExtension || ""]
  );
  return rows.insertId;
}

async function getKnowledgePostFiles(knowledgePostId) {
  const rows = await query("SELECT * FROM knowledge_post_files WHERE knowledgePostId = ? ORDER BY id ASC", [knowledgePostId]);
  return rows.map((row) => ({
    id: row.id,
    fileUrl: row.fileUrl,
    fileExtension: row.fileExtension
  }));
}

async function createBookmark(userId, contentType, contentId) {
  const rows = await query(
    "INSERT IGNORE INTO bookmarks (userId, contentType, contentId) VALUES (?, ?, ?)",
    [userId, contentType, contentId]
  );
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
  getKnowledgePostFiles,
  createBookmark,
  deleteBookmark,
  getUserBookmarks,
  isBookmarked,
  updateTask,
  getRecommendedContent
};
