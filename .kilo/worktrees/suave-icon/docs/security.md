# Security

## Authentication

- JWT issued on `POST /api/auth/login` and stored client-side in `localStorage`.
- API requests include `Authorization: Bearer <token>` header via shared `request()` helper.
- No refresh token or token rotation in v1.
- Tokens are stateless; revocation is not supported.
- Bcrypt with salt rounds 10 used for password hashing.

## Authorization

- `auth` middleware verifies JWT and attaches `req.user`.
- `adminOnly` middleware returns 403 if `req.user.role !== "admin"`.
- Frontend hides admin UI routes but backend enforces authority.

## Input Validation

- Express parses JSON bodies and multipart uploads via Multer.
- Database queries use parameterized SQL through `mysql2/promise` — no string concatenation.
- File uploads: limited by Multer memory/disk settings; only authenticated users can POST to upload endpoints.
- No arbitrary file download endpoint; `/uploads/*` serves from a fixed server directory.

## Secrets & Credentials

- `password_hash` stored in DB, never returned in API responses (sanitized in `getUserById` and `getUsers`).
- JWT secret currently hardcoded/login-less in app code (assumed to be in `AUTH_SECRET` env var in production).
- No database credentials in repo; connection string built from env vars.

## Transport & Headers

- CORS enabled for all origins in dev (no origin restriction in current code).
- Dev+prod cache headers set to `no-store, no-cache, must-revalidate`.
- Frontend served over HTTP in dev; production deployment should enforce HTTPS and secure cookies if token strategy changes.

## Rate Limiting

- **Not implemented in v1.**
- Recommendation: add express-rate-limit to `/api/auth/login` (max 5 attempts per 15 min per IP).

## Pre-Launch Checklist

- [ ] Move JWT secret and DB credentials to environment variables (no hardcoded fallbacks in production).
- [ ] Enable MySQL `utf8mb4` character set and enforce collation.
- [ ] Restrict CORS to production domain(s).
- [ ] Add rate limiting on auth endpoint.
- [ ] Validate all POST body shapes server-side (schema or runtime checks).
- [ ] Disable `upload.single()`/`.array()` limits or raise them based on actual needs.
- [ ] Review file upload directory for path traversal (current paths are timestamp-randomized).
- [ ] Run `npm audit` and patch high/critical vulnerabilities.
- [ ] Add Helmet or equivalent security headers in production.
- [ ] Confirm `bookmarks`, `recommendations`, and `notifications` only return data for authenticated user.
- [ ] Test SQL injection resistance with parameterized queries only.
- [ ] Confirm no sensitive data logged to console in production.

## Assumptions

- Deployment environment controls TLS termination; this app does not configure HTTPS directly.
- Internal ABM tool behind corporate VPN reduces public exposure risk.
- Users are trusted to not tamper with localStorage; no additional anti-XSS hardening implemented.
- File upload directory is writable and not web-accessible beyond the `/uploads` route.
