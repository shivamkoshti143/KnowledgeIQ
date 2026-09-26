# Error Handling

## Custom Error Classes

Frontend (conceptual; map to runtime checks in `src/api/client.js`):

| Class | When thrown | HTTP status | Default message |
|-------|-------------|-------------|-----------------|
| `AuthError` | Missing/invalid token | 401 | "Please log in again." |
| `ForbiddenError` | Admin-only endpoint hit by non-admin | 403 | "You don't have permission." |
| `NotFoundError` | Resource missing | 404 | "Not found." |
| `ValidationError` | Bad input body | 400 | "Invalid input." |
| `ServerError` | Unhandled exception | 500 | "Something went wrong." |
| `ConflictError` | Duplicate bookmark or similar | 409 | "Already exists." |

Backend produces errors as JSON: `{ "message": "<string>" }`.

## HTTP Status Code Table

| Code | Meaning | Usage in ABM TaskIQ |
|------|---------|---------------------|
| 200 | OK | Successful GET / PUT returning existing resource. |
| 201 | Created | Successful POST creating resource (videos, tasks, knowledge, bookmarks). |
| 400 | Bad Request | Malformed body, missing required fields, bad query params. |
| 401 | Unauthorized | No/invalid JWT on protected route. |
| 403 | Forbidden | Non-admin hitting admin-only endpoint or review/recommend actions. |
| 404 | Not Found | Entity ID does not exist. |
| 409 | Conflict | Duplicate bookmark or unique constraint violation. |
| 500 | Internal Server Error | Unhandled exception, DB connection failure. |

## Standard Response Shape

### Success

```json
{
  "ok": true,
  "data": { ... }
}
```

Some legacy endpoints return raw data without envelope. New endpoints should use the envelope.

### Error

```json
{
  "message": "Human-readable error string"
}
```

Frontend `request()` helper reads `payload.message` and throws an Error, which surfaces to UI via toast or error boundary.

## Central Error Handler

Frontend (`src/api/client.js`):
- Parses JSON with `.catch(() => ({}))` for empty/non-JSON responses.
- Throws `Error(payload.message || "Something went wrong")` if `!response.ok`.
- Callers catch and display via `setToast()` or alert.

Backend (`server/index.js`):
- No explicit centralized error handler in v1.
- Fallback SPA handler returns `index.html` for unknown routes.
- Recommendation: add an Express error middleware at the bottom of middleware stack that catches 4xx/5xx and returns `{ message }` JSON.

```js
app.use((err, req, res, next) => {
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(status).json({ message: err.message || "Something went wrong" });
});
```

## Logging Plan

| Layer | What to log | Destination | Format |
|-------|-------------|-------------|--------|
| Express | method, path, statusCode, duration, userId | Console (stdout) | JSON lines |
| MySQL pool | slow queries (>250ms) | Console (stderr) | SQL + params |
| Frontend | API errors (message + path + status) | Console.error | JSON |
| Frontend | Unhandled rejects / component crashes | ErrorBoundary | Console + toast |

No external logging SaaS in v1.

## Assumptions

- Frontend-to-backend errors flow through single `request()` helper; no per-call retry logic.
- Backend uses Express default error propagation (`next(err)`).
- Logging removed or reduced in production builds to avoid noise.
