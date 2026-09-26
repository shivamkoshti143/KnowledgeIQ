# Phases

## Shared definition of done for every phase

- [ ] App runs locally (`npm run dev`)
- [ ] MySQL schema is up to date
- [ ] Default accounts can log in
- [ ] Primary flow works end-to-end on localhost
- [ ] Build passes (`npm run build`)

---

## Phase 1 — MVP (Internal Alpha)

Goal: core content lifecycle — upload, approve, browse, and discuss.

### Checklist

#### Auth & bootstrap
- [ ] JWT login / logout
- [ ] Session hydration from localStorage
- [ ] `/api/bootstrap` returns all global data

#### Admin content creation
- [ ] Upload video (title, description, department, category, tags, thumbnail, file)
- [ ] Create knowledge post (text, file, or video)
- [ ] Submit task with multiple files
- [ ] Uploaded content enters `pending` status

#### Approval queue
- [ ] Admin sees pending videos + tasks
- [ ] Approve / reject with remarks
- [ ] Notification sent to uploader on status change

#### Employee browsing
- [ ] Homepage shows approved videos + tasks
- [ ] Department + tag filters
- [ ] Knowledge base with filters and search
- [ ] Pagination in knowledge feed

#### Detail & discussion
- [ ] Deep detail page for video / task / knowledge
- [ ] File carousel (PDF, images, video, download)
- [ ] Comment and reply on tasks
- [ ] Reply notifications

#### User management basics
- [ ] Admin can view / update users
- [ ] Manage departments, categories, tags

### APIs touched
- auth, bootstrap, videos (CRUD + review), tasks (CRUD + review + upload), knowledge (CRUD), comments, notifications, users, departments/categories/tags

### Tables touched
- users, departments, tags, categories, videos, video_tags, tasks, task_files, knowledge_posts, knowledge_post_files, comments, notifications, site_settings

---

## Phase 2 — Curated Discovery

Goal: help employees find relevant content faster.

### Checklist

#### Bookmarks
- [ ] Bookmark any video, task, or knowledge post
- [ ] Dedicated bookmarks page
- [ ] Unbookmark from list or detail view

#### Recommendations
- [ ] Admin can mark content as Recommended from approval queue, top videos, and detail view
- [ ] Recommended items shown in sidebar for both roles
- [ ] Employee homepage shows Recommended, Recently Added, Mostly Bookmarked sections

#### Smart thumbnails
- [ ] If task/knowledge has image upload, show first image as card thumbnail
- [ ] If task/knowledge has video upload, show Play icon on thumbnail
- [ ] Video cards use existing thumbnail keywords

### APIs touched
- bookmarks (CRUD), videos/:id/recommend, tasks/:id/recommend, knowledge/:id/recommend, recommended, bootstrap (includes bookmarks + isRecommended flags)

### Tables touched
- bookmarks, videos (add isRecommended), tasks (add isRecommended), knowledge_posts (add isRecommended)

---

## Phase 3 — Polish & Smarter Defaults

Goal: reduce friction in daily workflows.

### Checklist

#### Homepage UX
- [ ] Remove "View All" buttons from homepage sections
- [ ] Limit "Recently Added" to 8 items on homepage
- [ ] Sidebar scrollable with fixed header/footer on both admin and employee views

#### Site branding
- [ ] Admin can update portal name, logo, favicon
- [ ] Browser tab title reflects portal name from DB

#### Bookmark detail actions
- [ ] Bookmark/unbookmark directly from detail page
- [ ] Bookmark button reflects current state

#### Admin detail actions
- [ ] Recommend/unrecommend directly from detail page

#### Search & filter UX
- [ ] Advanced filters in knowledge base (department, category, date range, tag)
- [ ] Keyword search across knowledge base

### APIs touched
- site-settings (CRUD), knowledge (search/filters)

### Tables touched
- site_settings

---

## Phase 4 — Hardening & Scale Prep

Goal: secure, reliable, and ready for broader rollout.

### Checklist

#### Security hardening
- [ ] Rate limiting on auth endpoint
- [ ] Input validation / sanitization on all POST bodies
- [ ] Helmet-style security headers
- [ ] CORS restricted to production origin

#### Error handling
- [ ] Central Express error handler
- [ ] Standardized JSON response envelope
- [ ] Custom error classes on frontend
- [ ] Toast/snackbar success + error states on all mutations

#### Logging & observability
- [ ] Request logging (method, path, status, duration)
- [ ] Error logging with stack traces in development
- [ ] Frontend error boundary

#### Data & migration hygiene
- [ ] Schema migration files instead of ad-hoc ALTER TABLE
- [ ] Seed data idempotency checks
- [ ] Backup / restore procedure documented

#### Performance
- [ ] Image/video compression guidance
- [ ] Frontend code-splitting for routes
- [ ] Database query profiling for bootstrap endpoint

#### Documentation
- [ ] README updated with latest scripts and schema
- [ ] API contract documented per endpoint
- [ ] Deployment guide (Node + MySQL + Nginx or equivalent)

### APIs touched
- All routes reviewed for validation and error shape

### Tables touched
- All tables reviewed for indexes and conventions
