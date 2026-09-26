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
  passwordHash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'employee') DEFAULT 'employee',
  departmentId INT NULL,
  title VARCHAR(100) DEFAULT '',
  status ENUM('active', 'inactive') DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
  fileExtension VARCHAR(50) DEFAULT '',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_task_files_task ON task_files(taskId);

-- ============================================
-- KNOWLEDGE POST FILES
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_post_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  knowledgePostId INT NOT NULL,
  fileUrl VARCHAR(500) DEFAULT '',
  fileExtension VARCHAR(50) DEFAULT '',
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
  status ENUM('published', 'draft') DEFAULT 'published',
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
