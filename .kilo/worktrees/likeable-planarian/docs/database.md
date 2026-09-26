# Database

## Conventions

- Primary keys: `id` INT AUTO_INCREMENT
- Foreign keys: `tableName_id` referencing target table `id`
- Timestamps: `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` on tables requiring it
- Booleans: TINYINT(1) NOT NULL DEFAULT 0
- Enums stored as VARCHAR with application-level checks
- JSON not used; normalized into columns

## Schema

### departments

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | INT | PK | AUTO_INCREMENT |
| name | VARCHAR(100) | Unique | Department name |
| description | TEXT | | Optional description |
| created_at | TIMESTAMP | | Default now() |

### users

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | INT | PK | AUTO_INCREMENT |
| name | VARCHAR(140) | | Full name |
| email | VARCHAR(180) | Unique | Login identifier |
| password_hash | VARCHAR(255) | | Bcrypt hash |
| role | VARCHAR(20) | | `admin` or `employee` |
| department_id | INT | FK→departments.id | Nullable if unassigned |
| title | VARCHAR(120) | | Job title |
| status | VARCHAR(20) | | `active` or `inactive` |
| created_at | TIMESTAMP | | Default now() |

### tags

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | INT | PK | AUTO_INCREMENT |
| name | VARCHAR(64) | Unique | Lowercase tag string |
| created_at | TIMESTAMP | | Default now() |

### video_tags (M2M)

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| video_id | INT | PK, FK→videos.id | ON DELETE CASCADE |
| tag_id | INT | PK, FK→tags.id | ON DELETE CASCADE |

### categories

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | INT | PK | AUTO_INCREMENT |
| name | VARCHAR(100) | Unique | Category name |
| created_at | TIMESTAMP | | Default now() |

### videos

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | INT | PK | AUTO_INCREMENT |
| title | VARCHAR(180) | | Required |
| description | TEXT | | Required |
| department_id | INT | FK→departments.id | |
| category_id | INT | FK→categories.id | Nullable |
| uploader_id | INT | FK→users.id | |
| tags | VARCHAR(255) | | Comma-separated string |
| status | VARCHAR(20) | | `draft`, `pending`, `approved`, `rejected` |
| video_url | TEXT | | Uploaded video path |
| thumbnail_url | TEXT | | Uploaded thumbnail path |
| rejection_remarks | TEXT | | Populated on rejection |
| approved_by | INT | FK→users.id | Set on approval |
| approved_at | TIMESTAMP | | Set on approval |
| view_count | INT | | Default 0 |
| duration_seconds | INT | | Optional duration |
| created_at | TIMESTAMP | | Default now() |
| updated_at | TIMESTAMP | | Updated on edits |

Indexes: `idx_videos_status_department (status, department_id)`

### comments

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | INT | PK | AUTO_INCREMENT |
| video_id | INT | FK→videos.id | ON DELETE CASCADE |
| task_id | INT | FK→tasks.id | ON DELETE CASCADE |
| user_id | INT | FK→users.id | |
| parent_id | INT | FK→comments.id | Self-ref for replies |
| body | TEXT | | |
| status | VARCHAR(20) | | Default `open` |
| created_at | TIMESTAMP | | Default now() |

Indexes: `idx_comments_video_parent (video_id, parent_id)`

### notifications

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | INT | PK | AUTO_INCREMENT |
| user_id | INT | FK→users.id | ON DELETE CASCADE |
| type | VARCHAR(40) | | e.g. `video_approved`, `reply` |
| message | TEXT | | Human-readable text |
| video_id | INT | FK→videos.id | ON DELETE SET NULL |
| comment_id | INT | FK→comments.id | ON DELETE SET NULL |
| read_at | TIMESTAMP | | Null if unread |
| created_at | TIMESTAMP | | Default now() |

Indexes: `idx_notifications_user_unread (user_id, read_at)`

### tasks

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | INT | PK | AUTO_INCREMENT |
| title | VARCHAR(180) | | |
| description | TEXT | | |
| department_id | INT | FK→departments.id | |
| category_id | INT | FK→categories.id | Nullable |
| uploader_id | INT | FK→users.id | |
| file_url | VARCHAR(255) | | Single primary file path |
| file_extension | VARCHAR(20) | | For primary file |
| status | VARCHAR(20) | | `pending`, `approved`, `rejected` |
| rejection_remarks | TEXT | | |
| approved_by | INT | FK→users.id | |
| approved_at | TIMESTAMP | | |
| created_at | TIMESTAMP | | Default now() |

### task_files

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | INT | PK | AUTO_INCREMENT |
| task_id | INT | FK→tasks.id | ON DELETE CASCADE |
| file_url | VARCHAR(255) | | File path |
| file_extension | VARCHAR(20) | | File type |

### knowledge_posts

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | INT | PK | AUTO_INCREMENT |
| title | VARCHAR(180) | | |
| description | TEXT | | |
| tags | VARCHAR(255) | | Comma-separated |
| content_type | VARCHAR(20) | | `text`, `file`, `video` |
| file_url | VARCHAR(255) | | Primary file path |
| file_extension | VARCHAR(20) | | For primary file |
| category_id | INT | FK→categories.id | Nullable |
| department_id | INT | FK→departments.id | Nullable |
| uploader_id | INT | FK→users.id | |
| status | VARCHAR(20) | | `published`, `draft` |
| created_at | TIMESTAMP | | Default now() |

### knowledge_post_files

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | INT | PK | AUTO_INCREMENT |
| knowledge_post_id | INT | FK→knowledge_posts.id | ON DELETE CASCADE |
| file_url | VARCHAR(255) | | File path |
| file_extension | VARCHAR(20) | | File type |

### bookmarks

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| id | INT | PK | AUTO_INCREMENT |
| user_id | INT | FK→users.id | ON DELETE CASCADE |
| content_type | VARCHAR(20) | | `video`, `task`, `knowledge` |
| content_id | INT | | ID of the bookmarked item |
| created_at | TIMESTAMP | | Default now() |

Unique key: `(user_id, content_type, content_id)`
Indexes: `idx_bookmarks_user (user_id)`, `idx_bookmarks_content (content_type, content_id)`

### site_settings

| Column | Type | Key | Notes |
|--------|------|-----|-------|
| portal_name | VARCHAR(120) | | Browser tab title |
| logo_url | TEXT | | Optional logo path/URL |
| favicon_url | TEXT | | Optional favicon path/URL |

Single-row table.

## Relationships

```
departments 1───* users
departments 1───* videos
departments 1───* tasks
departments 1───* knowledge_posts
departments 1───* comments (via uploader, not FK)

users 1───* videos (uploader)
users 1───* tasks (uploader)
users 1───* knowledge_posts (uploader)
users 1───* comments
users 1───* notifications

categories 1───* videos
categories 1───* tasks
categories 1───* knowledge_posts

videos *───* tags (via video_tags)

videos 1───* comments
videos 1───* notifications

tasks 1───* task_files
tasks 1───* comments
tasks 1───* notifications

knowledge_posts 1───* knowledge_post_files

comments self-referencing (parent_id)
```

## Assumptions

- MySQL 8 with InnoDB and default UTF8MB4 charset.
- Column names use snake_case in schema.sql; some historical code paths reference camelCase aliases but MySQL is case-insensitive on Windows.
- `tags` stored as comma-separated strings rather than normalized rows for videos/knowledge posts in current codebase.
- `site_settings` is treated as a singleton; no multi-tenant support.
- File paths stored as relative paths (e.g., `/uploads/...`) rather than absolute URLs.
