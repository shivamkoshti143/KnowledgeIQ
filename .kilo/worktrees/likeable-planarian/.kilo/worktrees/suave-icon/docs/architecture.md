# Architecture

## Overview

ABM TaskIQ is a single-repository web application for ABM teams to share task guidance, playbooks, and videos. Approved content is visible to employees; admins moderate submissions and can highlight content as "Recommended". The app runs on React 19 + Express + MySQL with JWT authentication and file uploads via Multer.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React 19 | Component model fits page state, SEO not required. |
| Bundler | Vite 6 | Fast HMR, simple static output for production. |
| Icons | Lucide React | Tree-shakeable, consistent iconography. |
| Backend | Express.js | Minimal API surface, easy middleware for auth/uploads. |
| Auth | JWT (`jsonwebtoken`) | Stateless auth suitable for browser + API. |
| Uploads | Multer | Handles multipart forms for video / task / knowledge files. |
| Database | MySQL 8 | Relational model fits departments, users, content metadata. |
| Process mgmt | Concurrently | Run Vite dev server + Express in one terminal. |

## Data-flow diagram

```
Browser
  │
  ▼
React App (Vite)
  │
  │  request() → Bearer token from localStorage
  ▼
Express API (:4001)
  │
  │  auth middleware → req.user
  │  router dispatch
  ▼
db.js (mysql2 pool)
  │
  ▼
MySQL (:3306)
```

/uploads/:filename are served statically from Express.

## Full API List

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/auth/login | Public | Issue JWT for credentials. |
| GET | /api/bootstrap | User | Load all app data (departments, tags, videos, tasks, knowledge posts, users, notifications, bookmarks, site settings). |
| GET | /api/videos | User | List videos (admins see all; employees see approved only). |
| POST | /api/videos | User | Upload video (status becomes pending). |
| POST | /api/videos/:id/view | User | Increment view count. |
| POST | /api/videos/:id/review | Admin | Approve or reject pending video. |
| POST | /api/videos/:id/recommend | Admin | Toggle isRecommended flag. |
| GET | /api/tasks | User | List tasks (admins see all; employees see approved only). |
| POST | /api/tasks | User | Submit task with files (status becomes pending). |
| POST | /api/tasks/:id/review | Admin | Approve or reject pending task. |
| POST | /api/tasks/:id/recommend | Admin | Toggle isRecommended flag. |
| GET | /api/tasks/user/me | User | List tasks uploaded by current user. |
| POST | /api/tasks/:id/view | User | Mark task as viewed. |
| GET | /api/knowledge | User | List knowledge posts. |
| POST | /api/knowledge | Admin | Create knowledge post. |
| PUT | /api/knowledge/:id | Admin | Update knowledge post. |
| DELETE | /api/knowledge/:id | Admin | Delete knowledge post. |
| POST | /api/knowledge/:id/recommend | Admin | Toggle isRecommended flag. |
| GET | /api/bookmarks | User | List current user's bookmarks. |
| POST | /api/bookmarks | User | Add bookmark. |
| DELETE | /api/bookmarks | User | Remove bookmark. |
| GET | /api/comments | User | List comments (optionally filtered). |
| POST | /api/comments | User | Create comment or reply. |
| GET | /api/notifications | User | List notifications for current user. |
| POST | /api/notifications/read | User | Mark all notifications as read. |
| GET | /api/departments | User | List departments. |
| POST | /api/departments | Admin | Create department. |
| PUT | /api/departments/:id | Admin | Update department. |
| DELETE | /api/departments/:id | Admin | Delete department. |
| GET | /api/tags | User | List tags. |
| POST | /api/tags | Admin | Create tag. |
| DELETE | /api/tags/:id | Admin | Delete tag. |
| GET | /api/categories | User | List categories. |
| POST | /api/categories | Admin | Create category. |
| PUT | /api/categories/:id | Admin | Update category. |
| DELETE | /api/categories/:id | Admin | Delete category. |
| GET | /api/site-settings | User | Fetch portal branding. |
| PUT | /api/site-settings | Admin | Update portal name, logo, favicon. |
| GET | /api/users | Admin | List all users. |
| PUT | /api/users/:id | Admin | Update user role, department, status. |
| GET | /api/recommended | User | List admin-recommended content. |

Post-mounted inline routes:
- POST /api/videos/:id/review
- POST /api/tasks/:id/review

## Integrations

No external integrations in v1.
- MySQL for persistence.
- Local filesystem for media storage (uploads directory served by Express).
- Browser localStorage used only for token + session hydration.

## Constraints

- Single repo; no separate microservices.
- File uploads stored on local disk; not S3-compatible.
- No real-time websockets; notifications are polled via bootstrap + reload.
- No pagination cursor; simple offset pagination in KnowledgeFeed only.
- MySQL 8 assumed for TINYINT behavior in boolean columns.

## Open Questions

- Should videos and tasks share a unified content table in future?
- Do we need soft-delete for content or hard-delete?
- Is local disk uploads sufficient or should we plan for S3?
- Should we add rate limiting on auth in early phases?
- Do comments need moderation workflow?
