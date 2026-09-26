-- ============================================
-- ABM TaskIQ - KnowledgeIQ Database Schema
-- ============================================
-- Database: knowledgeiq
-- Create this database in XAMPP phpMyAdmin first, then import this SQL.

CREATE DATABASE IF NOT EXISTS knowledgeiq;
USE knowledgeiq;

-- ============================================
-- USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NULL,
  role ENUM('admin', 'employee') DEFAULT 'employee',
  departmentId INT NULL,
  title VARCHAR(100) DEFAULT '',
  status ENUM('active', 'inactive') DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  purpose ENUM('signup', 'login') NOT NULL,
  metadata JSON DEFAULT NULL,
  expiresAt DATETIME NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otps_email ON otps(email);
CREATE INDEX idx_otps_expires ON otps(expiresAt);

-- ============================================
-- DEPARTMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TAGS
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- VIDEOS
-- ============================================
CREATE TABLE IF NOT EXISTS videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  departmentId INT NOT NULL,
  categoryId INT NULL,
  uploaderId INT NOT NULL,
  tags TEXT DEFAULT '',
  status ENUM('pending', 'approved', 'rejected', 'draft') DEFAULT 'pending',
  rejectionRemarks TEXT DEFAULT NULL,
  approvedBy INT NULL,
  approvedAt DATETIME NULL,
  videoUrl VARCHAR(500) DEFAULT '',
  fileExtension VARCHAR(50) DEFAULT '',
  viewCount INT DEFAULT 0,
  duration VARCHAR(10) DEFAULT '00:00',
  thumbnail VARCHAR(50) DEFAULT 'upload',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (departmentId) REFERENCES departments(id),
  FOREIGN KEY (categoryId) REFERENCES categories(id),
  FOREIGN KEY (uploaderId) REFERENCES users(id)
);

CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_department ON videos(departmentId);
CREATE INDEX idx_videos_category ON videos(categoryId);

-- ============================================
-- TASKS
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  departmentId INT NOT NULL,
  categoryId INT NULL,
  uploaderId INT NOT NULL,
  fileUrl VARCHAR(500) DEFAULT '',
  fileExtension VARCHAR(50) DEFAULT '',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  rejectionRemarks TEXT DEFAULT NULL,
  approvedBy INT NULL,
  approvedAt DATETIME NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (departmentId) REFERENCES departments(id),
  FOREIGN KEY (categoryId) REFERENCES categories(id),
  FOREIGN KEY (uploaderId) REFERENCES users(id)
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_department ON tasks(departmentId);

-- ============================================
-- TASK FILES
-- ============================================
CREATE TABLE IF NOT EXISTS task_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  taskId INT NOT NULL,
  fileUrl VARCHAR(500) DEFAULT '',
  fileName VARCHAR(255) DEFAULT '',
  fileExtension VARCHAR(50) DEFAULT '',
  approvalStatus ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  adminRemarks TEXT DEFAULT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_task_files_task ON task_files(taskId);

-- ============================================
-- TASK ACCESS
-- ============================================
CREATE TABLE IF NOT EXISTS task_access (
  id INT AUTO_INCREMENT PRIMARY KEY,
  taskId INT NOT NULL,
  userId INT NOT NULL,
  grantedBy INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (grantedBy) REFERENCES users(id),
  UNIQUE KEY unique_task_user (taskId, userId)
);

CREATE INDEX idx_task_access_task ON task_access(taskId);
CREATE INDEX idx_task_access_user ON task_access(userId);

-- ============================================
-- ROLES
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- PERMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  module VARCHAR(50) NOT NULL,
  menu VARCHAR(100) NOT NULL,
  submenu VARCHAR(100) DEFAULT '',
  permission_name VARCHAR(100) NOT NULL,
  permission_key VARCHAR(100) NOT NULL UNIQUE,
  permission_type ENUM('view', 'add', 'edit', 'delete', 'approve', 'reject', 'status', 'export', 'import', 'assign') DEFAULT 'view',
  description TEXT DEFAULT '',
  parent_permission_id INT DEFAULT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE INDEX idx_permissions_module ON permissions(module);
CREATE INDEX idx_permissions_parent ON permissions(parent_permission_id);
CREATE INDEX idx_permissions_key ON permissions(permission_key);

-- ============================================
-- ROLE PERMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id)
);

-- ============================================
-- USER ROLES
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  granted_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id)
);

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role_id INT DEFAULT NULL,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  permission VARCHAR(100) DEFAULT NULL,
  target_type VARCHAR(50) DEFAULT NULL,
  target_id INT DEFAULT NULL,
  old_value TEXT DEFAULT NULL,
  new_value TEXT DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================
-- PERMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  category VARCHAR(50) DEFAULT 'general',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ROLE PERMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- ============================================
-- KNOWLEDGE POST FILES
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_post_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  knowledgePostId INT NOT NULL,
  fileUrl VARCHAR(500) DEFAULT '',
  fileName VARCHAR(255) DEFAULT '',
  fileExtension VARCHAR(50) DEFAULT '',
  approvalStatus ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  adminRemarks TEXT DEFAULT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (knowledgePostId) REFERENCES knowledge_posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_knowledge_post_files_post ON knowledge_post_files(knowledgePostId);

-- ============================================
-- COMMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  videoId INT NULL,
  taskId INT NULL,
  userId INT NOT NULL,
  parentId INT NULL,
  body TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (parentId) REFERENCES comments(id)
);

CREATE INDEX idx_comments_video ON comments(videoId);
CREATE INDEX idx_comments_task ON comments(taskId);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  videoId INT NULL,
  taskId INT NULL,
  commentId INT NULL,
  readAt DATETIME NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE INDEX idx_notifications_user ON notifications(userId);

-- ============================================
-- SITE SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS site_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  portalName VARCHAR(255) DEFAULT 'ABM TaskIQ',
  logoUrl VARCHAR(500) DEFAULT '',
  faviconUrl VARCHAR(500) DEFAULT '',
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO site_settings (portalName, logoUrl, faviconUrl) VALUES ('ABM TaskIQ', '', '') ON DUPLICATE KEY UPDATE portalName = VALUES(portalName);

-- ============================================
-- KNOWLEDGE POSTS
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  tags VARCHAR(500) DEFAULT '',
  contentType ENUM('text', 'file', 'video') DEFAULT 'text',
  fileUrl VARCHAR(500) DEFAULT '',
  fileExtension VARCHAR(50) DEFAULT '',
  categoryId INT NULL,
  departmentId INT NULL,
  uploaderId INT NOT NULL,
  status ENUM('published', 'draft', 'pending') DEFAULT 'draft',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoryId) REFERENCES categories(id),
  FOREIGN KEY (departmentId) REFERENCES departments(id),
  FOREIGN KEY (uploaderId) REFERENCES users(id)
);

CREATE INDEX idx_knowledge_department ON knowledge_posts(departmentId);
CREATE INDEX idx_knowledge_category ON knowledge_posts(categoryId);
CREATE INDEX idx_knowledge_status ON knowledge_posts(status);

-- ============================================
-- BOOKMARKS
-- ============================================
CREATE TABLE IF NOT EXISTS bookmarks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  contentType ENUM('video', 'task', 'knowledge') NOT NULL,
  contentId INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_bookmark (userId, contentType, contentId)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(userId);
CREATE INDEX idx_bookmarks_content ON bookmarks(contentType, contentId);

-- ============================================
-- ACTIVITY LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  route VARCHAR(100) NOT NULL,
  method VARCHAR(10) NOT NULL,
  userAgent TEXT DEFAULT NULL,
  ipAddress VARCHAR(45) DEFAULT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_activity_logs_user ON activity_logs(userId);
CREATE INDEX idx_activity_logs_created ON activity_logs(createdAt);

-- ============================================
-- OTPs
-- ============================================
CREATE TABLE IF NOT EXISTS otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  purpose ENUM('signup', 'login') NOT NULL,
  metadata JSON DEFAULT NULL,
  expiresAt DATETIME NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otps_email ON otps(email);
CREATE INDEX idx_otps_expires ON otps(expiresAt);

-- ============================================
-- MIGRATIONS for existing databases
-- ============================================
ALTER TABLE users MODIFY COLUMN passwordHash VARCHAR(255) NULL;

-- Migrate old permissions table to new RBAC schema
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS module VARCHAR(50) NOT NULL DEFAULT 'general' AFTER id;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS menu VARCHAR(100) NOT NULL DEFAULT '' AFTER module;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS submenu VARCHAR(100) DEFAULT '' AFTER menu;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS permission_name VARCHAR(100) NOT NULL DEFAULT '' AFTER submenu;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS permission_key VARCHAR(100) NOT NULL DEFAULT '' AFTER permission_name;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS permission_type ENUM('view', 'add', 'edit', 'delete', 'approve', 'reject', 'status', 'export', 'import', 'assign') DEFAULT 'view' AFTER permission_key;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS parent_permission_id INT DEFAULT NULL AFTER description;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive') DEFAULT 'active' AFTER parent_permission_id;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0 AFTER status;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER sort_order;

-- Migrate old data: copy `key` to `permission_key` and `category` to `module`
UPDATE permissions SET permission_key = `key`, permission_name = `key`, module = category, menu = category, status = 'active', sort_order = id WHERE permission_key = '' AND `key` != '';

-- Make permission_key unique if not already
ALTER TABLE permissions ADD UNIQUE IF NOT EXISTS UNIQUE_KEY (permission_key);

-- Update role_permissions table to include granted_by and created_at if missing
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS granted_by INT DEFAULT 1 AFTER permission_id;
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP AFTER granted_by;

-- Update user_roles table to include created_at if missing
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP AFTER role_id;
