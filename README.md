# ABM TaskIQ

Smart task guidance and knowledge sharing platform for ABM teams with **Microsoft Teams OTP Authentication**.

## 🏗️ Architecture Overview

```
┌─────────────┐     HTTPS      ┌─────────────┐
│   React.js  │ ──────────────▶ │  PHP REST   │
│  Frontend   │                 │    API      │
└─────────────┘                 └──────┬──────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
               ┌─────────┐        ┌──────────┐     ┌──────────┐
               │  MySQL  │        │Microsoft │     │Microsoft │
               │Database │        │  Entra   │     │  Teams   │
               │         │        │    ID    │     │   Bot    │
               └─────────┘        └──────────┘     └──────────┘
```

**Security Principle**: React **NEVER** contains Microsoft credentials. All secrets stay server-side.

## 🔐 Microsoft Teams OTP Authentication

### Features
- **Registration + Login** via Microsoft Teams OTP
- **6-digit cryptographically secure OTPs**
- **5-minute expiration**, one-time use
- **Rate limiting** (per email + IP)
- **Brute-force protection** (max 5 attempts)
- **60-second resend cooldown**
- **Audit logging** for all auth events
- **Account enumeration protection** (generic responses)

### Flow Summary

**Registration:**
1. User enters name, email, password, department on website
2. PHP validates company domain, checks for existing account
3. Checks if user has Teams Bot connected
4. Creates pending registration, generates secure OTP, hashes it
5. Sends OTP via Teams Bot to user's Teams account
6. User enters OTP on website
7. PHP verifies OTP hash, creates active user account, returns JWT

**Login:**
1. User enters email on website
2. PHP validates domain, checks active account exists
3. Checks Teams connection
4. Generates secure OTP, hashes it, stores in login_otp_requests
5. Sends OTP via Teams Bot
6. User enters OTP
7. PHP verifies, returns JWT token

## 📋 Prerequisites

### Microsoft Azure / Entra ID Setup

1. **Create App Registration** in Azure Portal:
   - Go to Azure Portal → Microsoft Entra ID → App registrations → New registration
   - Name: "TaskIQ Bot"
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: (leave blank for bot)
   - Note: **Application (client) ID** → `MICROSOFT_CLIENT_ID`
   - Note: **Directory (tenant) ID** → `MICROSOFT_TENANT_ID`

2. **Create Client Secret**:
   - Certificates & secrets → New client secret
   - Note: **Value** → `MICROSOFT_CLIENT_SECRET`

3. **API Permissions** (Application permissions):
   - Microsoft Graph: `User.Read.All`, `Chat.ReadWrite`, `ChannelMessage.Send`
   - Grant admin consent

4. **Create Bot Registration**:
   - Go to Azure Portal → Azure Bot → Create
   - Use the same App Registration from step 1
   - Messaging endpoint: `https://your-api-domain.com/api/teams/messages`
   - Note: **Microsoft App ID** → `MICROSOFT_BOT_ID` (same as client ID)
   - Note: **Microsoft App Password** → `MICROSOFT_BOT_PASSWORD` (same as client secret)

5. **Teams App Manifest**:
   - Use `teams-app/manifest.template.json` as template
   - Replace placeholders:
     - `{{MICROSOFT_BOT_ID}}` → Your Bot ID
     - `{{MICROSOFT_CLIENT_ID}}` → Your Client ID
     - `{{FRONTEND_DOMAIN}}` → Your frontend domain
     - `{{API_DOMAIN}}` → Your API domain
   - Zip manifest + icons → Upload to Teams Admin Center or Developer Portal

6. **Deploy to Organization**:
   - Teams Admin Center → Teams apps → Manage apps → Upload
   - Or: Developer Portal → Publish to org
   - Users can then install from Apps in Teams

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=knowledgeiq

# JWT
JWT_SECRET=your-super-secure-random-secret-min-32-chars

# Microsoft Entra ID
MICROSOFT_TENANT_ID=your-tenant-id
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret

# Microsoft Teams Bot
MICROSOFT_BOT_ID=your-bot-id
MICROSOFT_BOT_PASSWORD=your-bot-password

# Optional: Microsoft Graph
MICROSOFT_AUTHORITY=https://login.microsoftonline.com
MICROSOFT_GRAPH_ENDPOINT=https://graph.microsoft.com

# Allowed email domains
ALLOWED_EMAIL_DOMAINS=abmindia.com,abm.com

# Email fallback (SMTP)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=tls
SMTP_USER=your-email@company.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@company.com

# Frontend URL
FRONTEND_URL=http://localhost:5173

# OTP Configuration
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_REQUESTS_PER_HOUR=10

# Rate Limiting
RATE_LIMIT_WINDOW_MINUTES=60
RATE_LIMIT_MAX_REQUESTS=20

# Security
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=lax

# Application
APP_NAME=ABM TaskIQ
```

## 🗄️ Database Schema

### New Tables

| Table | Purpose |
|-------|---------|
| `pending_registrations` | Stores registration data before OTP verification |
| `teams_users` | Maps app users to Teams identities (conversation references) |
| `login_otp_requests` | Tracks login OTP requests with hashed OTPs |
| `audit_logs` | Security audit trail for all auth events |
| `otp_rate_limits` | Rate limiting for OTP requests |

### Modified Tables

- `users`: Added `email_verified`, `status` columns

### Run Migration

```bash
php run_migration.php
```

## 🚀 API Endpoints

### Authentication (New Teams OTP)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Start registration, send OTP to Teams |
| POST | `/api/auth/register/verify-otp` | Verify OTP, complete registration |
| POST | `/api/auth/register/resend-otp` | Resend registration OTP |
| POST | `/api/auth/send-otp` | Send login OTP to Teams |
| POST | `/api/auth/verify-otp` | Verify login OTP, get JWT |
| POST | `/api/auth/resend-otp` | Resend login OTP |
| POST | `/api/auth/logout` | Logout (client-side) |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/teams/connect` | Store Teams conversation reference |
| GET | `/api/auth/teams/status` | Check Teams connection status |

### Authentication (Legacy - Email OTP)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Legacy email-based signup |
| POST | `/api/auth/login` | Legacy email-based login |
| POST | `/api/auth/verify-otp-legacy` | Legacy OTP verification |

### Teams Bot Webhook

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/teams/messages` | Bot Framework webhook |

### Admin Health Check & Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/microsoft-teams-health` | Teams integration health check |
| GET | `/api/site-settings` | Get site settings (branding + department restriction) |
| POST | `/api/site-settings` | Update site settings (branding + toggle department restriction) |

## 🏢 Department Content Restriction (Admin Controlled)

TaskIQ allows administrators to enforce department-level content isolation across the entire platform:

- **Admin Toggle**: In the Admin Portal under **Site Settings**, administrators can toggle **"Department Content Restriction"** ON or OFF at any time.
- **When Enabled**:
  - Regular employees and standard users can **only view** knowledge posts, task guides, and related content assigned to their own department (plus content they authored themselves).
  - Users are prohibited from querying or browsing knowledge/tasks from other departments. Direct URL access to items outside their department returns HTTP 403 Forbidden.
  - In the frontend (Knowledge Base, Tasks, Search, Dashboard), department selectors lock to their assigned department with a clear indicator.
- **When Disabled**:
  - Content isolation is relaxed. Standard users can browse and search knowledge posts and task guides across all organizational departments.
- **Admin Visibility**:
  - Administrators always maintain unrestricted, organization-wide visibility across all departments regardless of the toggle state.

## 🛡️ Security Features

### OTP Security
- **Cryptographically secure**: Uses `random_bytes()` 
- **Hashed storage**: `password_hash()` / `password_verify()`
- **Never logged**: OTP values never appear in logs
- **One-time use**: Marked verified after use
- **Auto-expiry**: 5 minutes (configurable)

### Rate Limiting
- **Per email + IP**: Separate limits for registration/login/resend
- **Hourly window**: Configurable max requests
- **Auto-block**: 15-minute block after exceeding limit
- **Resend cooldown**: 60 seconds between requests

### Account Protection
- **Generic responses**: Never reveal if email exists
- **Timing consistency**: Same response time for valid/invalid emails
- **Session security**: JWT with 8-hour expiry, HttpOnly cookies ready

### Audit Logging
Events logged: `REGISTRATION_STARTED`, `REGISTRATION_OTP_SENT`, `REGISTRATION_VERIFIED`, `REGISTRATION_COMPLETED`, `LOGIN_OTP_SENT`, `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `TEAMS_CONNECTED`, `TEAMS_MESSAGE_SENT`, `TEAMS_MESSAGE_FAILED`, `OTP_EXPIRED`, `OTP_RATE_LIMITED`

## 🧪 Testing

### Manual Testing Checklist

**Registration:**
- [ ] Valid registration with company email
- [ ] Invalid email format rejected
- [ ] Non-company domain rejected
- [ ] Duplicate email rejected
- [ ] Password validation enforced
- [ ] Teams not connected → proper error
- [ ] OTP sent to Teams
- [ ] OTP expires after 5 minutes
- [ ] Invalid OTP rejected
- [ ] Correct OTP creates account
- [ ] OTP cannot be reused
- [ ] Max 5 attempts enforced
- [ ] Resend cooldown works
- [ ] Successful registration logs in user

**Login:**
- [ ] Valid user receives OTP
- [ ] Invalid user gets generic response
- [ ] OTP sent to Teams
- [ ] Invalid OTP rejected
- [ ] Expired OTP rejected
- [ ] Reused OTP rejected
- [ ] Max 5 attempts enforced
- [ ] Resend cooldown works
- [ ] Successful login returns JWT

**Teams:**
- [ ] User can connect via "connect email@domain.com"
- [ ] Welcome message on bot install
- [ ] Help command works
- [ ] Conversation reference stored
- [ ] Proactive messages delivered

**Security:**
- [ ] SQL injection attempts blocked
- [ ] XSS attempts blocked
- [ ] Rate limiting enforced
- [ ] Brute force blocked
- [ ] Secrets not in frontend
- [ ] Audit logs written

## 📦 Project Structure (Updated)

```
php-server/
  controllers/
    auth.controller.php      # New Teams OTP endpoints
    teams.controller.php     # Bot Framework webhook
  services/
    teams.service.php        # Teams Bot proactive messaging
    role.service.php         # RBAC
  utils/
    db.php                   # Updated with new table methods
    email.php                # SMTP fallback

database/
  schema.sql                 # Base schema
  migrations/
    002_teams_otp_auth.sql   # Teams OTP tables

teams-app/
  manifest.template.json     # Teams App manifest template
  icon-color.png             # 192x192 color icon
  icon-outline.png           # 32x32 outline icon

src/
  components/
    OtpInput.jsx             # 6-digit OTP input
    ResendOtpTimer.jsx       # Cooldown + expiry timers
    AuthFeedback.jsx         # Error/Loading/Success states
    TeamsNotConnected.jsx    # Teams connection guidance
  pages/
    AuthScreen.jsx           # Updated with Teams OTP flow
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Start dev servers (client + PHP API)
npm run dev

# Or separately:
npm run client        # Vite on :5173
npm run server        # PHP on :4001

# Build for production
npm run build

# Run migration
php run_migration.php
```

## 📝 Teams Bot Commands

Users can interact with the bot in Teams:

| Command | Description |
|---------|-------------|
| `connect your@email.com` | Link Teams account to TaskIQ |
| `help` | Show available commands |

## 🐛 Troubleshooting

### OTP Not Received in Teams
1. Check Teams Bot is installed for user
2. Verify `MICROSOFT_BOT_ID` and `MICROSOFT_BOT_PASSWORD`
3. Check `/api/admin/microsoft-teams-health` endpoint
4. Verify conversation reference stored in `teams_users` table
5. Check PHP error logs for Teams API errors

### "Teams not connected" Error
- User must install TaskIQ Bot in Teams
- User must send `connect their@email.com` to bot
- Or admin deploys bot centrally via Teams Admin Center

### Database Errors
- Run migration: `php run_migration.php`
- Check MySQL is running and credentials correct
- Verify tables exist: `pending_registrations`, `teams_users`, `login_otp_requests`, `audit_logs`, `otp_rate_limits`

### Microsoft API Errors
- Verify Entra ID app has correct permissions
- Check admin consent granted
- Verify tenant ID, client ID, client secret correct
- Check bot registration messaging endpoint accessible

## 📚 Documentation Index

| Document | Description |
|----------|-------------|
| `docs/architecture.md` | System architecture |
| `docs/database.md` | Database schema |
| `docs/security.md` | Security considerations |
| `docs/error-handling.md` | Error handling patterns |
| `docs/phases.md` | Implementation phases |

## 🔒 Production Deployment Checklist

- [ ] Set strong `JWT_SECRET` (32+ chars)
- [ ] Configure all Microsoft credentials in `.env`
- [ ] Enable HTTPS (SSL certificates)
- [ ] Set `SESSION_COOKIE_SECURE=true`
- [ ] Configure CORS for production domains
- [ ] Deploy Teams App via Teams Admin Center
- [ ] Set up monitoring for `/api/admin/microsoft-teams-health`
- [ ] Configure log rotation for audit logs
- [ ] Set up database backups
- [ ] Test full registration + login flow in production

## 📄 License

Internal use only - ABM Knowledgeware