# ABM TaskIQ

Smart task guidance and knowledge sharing platform for ABM teams. Built with React 19, Express, and MySQL.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 6, Lucide icons |
| Backend | Express.js, JWT auth, Multer uploads |
| Database | MySQL 8 |
| Dev | Concurrently for client + server |

## Quick Start

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4001

Default accounts:
- Admin: admin@abm.com / admin123
- Employee: karthik@abm.com / password123

## Functionality (Workflow-wise)

### 1. Authentication & Access Control
- JWT-based login with role detection (admin vs employee)
- Auto route assignment on login
- Session hydration from localStorage
- Protected API routes via auth middleware
- Admin-only endpoints guarded by role checks

### 2. Admin Publishing & Review Workflow
- **Upload videos** with thumbnails, tags, department, and category
- **Submit tasks** with multiple file attachments, descriptions, and metadata
- **Create knowledge posts** in text, file, or video format
- **Approval queue** for pending videos and tasks
- **Approve / Reject** actions with optional rejection remarks
- **Notifications** sent to uploaders on status changes
- **Mark as Recommended** any approved video, task, or knowledge post from admin panel or detail preview
- View **Top Performing Videos** sorted by view count

### 3. Content Discovery (Employee Homepage)
- **Recommended** — Admin-curated content flagged as recommended
- **Recently Added** — Latest approved and published content (sorted by date)
- **Mostly Bookmarked** — Most-saved tasks and knowledge (sorted by bookmark count)
- Combined feed of videos, tasks, and knowledge posts
- Department and tag filters with search bar

### 4. Knowledge Base & Browse
- Unified feed mixing tasks and knowledge posts
- Advanced filters: department, category, date range, tag, keyword search
- Paginated results
- Bookmark toggle on every card
- File carousel in detail view for PDFs, images, videos, and downloads

### 5. Task Management (Employees)
- Submit new tasks with file uploads
- View task details with discussion thread
- Comment and reply on tasks
- Track task status (pending / approved / rejected)

### 6. Bookmarks
- Bookmark any video, task, or knowledge post
- Dedicated **Bookmarks** page showing all saved items
- Unbookmark from listing or deep detail page
- Persistent per-user bookmark list

### 7. Recommendations
- Admin can mark content as Recommended from:
  - Approval queue rows
  - Top performing videos list
  - Deep detail preview (video, task, knowledge)
- Recommended items appear in:
  - Admin and user sidebar **Recommended** menu
  - Employee homepage **Recommended** section
- Toggle recommendation on/off

### 8. Notifications
- Admin receives approval queue notifications when videos or tasks are submitted
- Employee receives status notifications when content is approved or rejected
- Reply notifications when someone responds to a comment
- Unread notification badge in sidebar
- Mark all as read

### 9. Site Customization
- Admin can update portal name, logo URL, and favicon from Site Settings
- Dynamic browser tab title updates from database settings

### 10. User Management (Admin)
- View all users
- Update user role, department, and status
- Manage departments, categories, and tags

### 11. Responsive UI
- Collapsible sidebar with scrollable navigation on both admin and employee views
- Mobile-friendly layout with hamburger menu
- Sticky sidebar with header and footer fixed

## Project Structure

```
src/
  api/
    client.js              # HTTP client with JWT injection
  components/
    BookmarkButton.jsx     # Reusable bookmark toggle
    Shell.jsx              # App shell, sidebar, mobile nav
    UI.jsx                 # Shared primitives (PageTitle, Metric, etc.)
    VideoCard.jsx          # Card + VideoSection with smart thumbnails
  pages/
    AdminDashboard.jsx     # Approval queue, top videos, recommend actions
    EmployeeDashboard.jsx  # Homepage: recommended, recent, bookmarked
    KnowledgeFeed.jsx      # Browse knowledge base with filters
    KnowledgeDetail.jsx    # Deep detail for video/task/knowledge
    BookmarkFeed.jsx       # User bookmarks page
    RecommendedFeed.jsx    # Admin-recommended content page
    Tasks.jsx              # Task listing with bookmark support
    Notifications.jsx      # Notification center
    ManageUsers.jsx        # User CRUD
    ManageTaxonomy.jsx     # Departments, categories, tags
    SiteSettings.jsx       # Portal branding settings
    ...
  App.jsx                  # Central state store and router
  styles.css               # Global styles

server/
  index.js                 # Express app, inline review routes
  db.js                    # MySQL connection pool
  utils/
    db.js                  # Query helpers, seeders, recommend logic
  middleware/
    auth.middleware.js     # JWT auth + adminOnly guard
  routes/
    auth.routes.js
    bootstrap.routes.js    # Global data fetch
    video.routes.js        # Video CRUD + recommend endpoint
    task.routes.js         # Task CRUD + recommend endpoint
    knowledge.routes.js    # Knowledge CRUD + recommend endpoint
    bookmark.routes.js     # Bookmark CRUD
    comment.routes.js
    notification.routes.js
    department.routes.js
    category.routes.js
    tag.routes.js
    site-settings.routes.js
    admin.routes.js

database/
  schema.sql               # MySQL schema
```

## API Overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/bootstrap | Load all app data |
| POST | /api/auth/login | User login |
| POST | /api/videos/:id/review | Approve / reject video (admin) |
| POST | /api/tasks/:id/review | Approve / reject task (admin) |
| POST | /api/videos/:id/recommend | Toggle video recommendation (admin) |
| POST | /api/tasks/:id/recommend | Toggle task recommendation (admin) |
| POST | /api/knowledge/:id/recommend | Toggle knowledge recommendation (admin) |
| GET | /api/recommended | List recommended content |
| POST | /api/bookmarks | Add bookmark |
| DELETE | /api/bookmarks | Remove bookmark |
| GET | /api/bookmarks | List user bookmarks |
| POST | /api/notifications/read | Mark notifications as read |
| PUT | /api/site-settings | Update portal branding |

## Scripts

```bash
npm run dev        # Start client and server concurrently
npm run build      # Production build
npm run preview    # Preview production build
```
