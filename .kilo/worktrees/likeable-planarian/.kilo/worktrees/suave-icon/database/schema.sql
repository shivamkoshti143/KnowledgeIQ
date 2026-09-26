-- ABM TaskIQ relational schema.
-- Works with PostgreSQL with minor changes for MySQL: replace SERIAL/JSONB/TIMESTAMPTZ
-- with AUTO_INCREMENT/JSON/DATETIME and adapt enum checks as needed.

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'employee')),
  department_id INT REFERENCES departments(id),
  title VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE videos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  department_id INT NOT NULL REFERENCES departments(id),
  uploader_id INT NOT NULL REFERENCES users(id),
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  rejection_remarks TEXT,
  approved_by INT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  view_count INT NOT NULL DEFAULT 0,
  duration_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE video_tags (
  video_id INT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  tag_id INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, tag_id)
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  video_id INT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id),
  parent_id INT REFERENCES comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  message TEXT NOT NULL,
  video_id INT REFERENCES videos(id) ON DELETE SET NULL,
  comment_id INT REFERENCES comments(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_videos_status_department ON videos(status, department_id);
CREATE INDEX idx_comments_video_parent ON comments(video_id, parent_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at);
