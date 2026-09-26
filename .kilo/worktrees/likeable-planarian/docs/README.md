# The 6 Context Files Your Vibe Coding Needs

These 6 markdown files give your AI (Claude Code, Cursor, Windsurf, etc.) the context it
needs to build a real project — not just a demo that breaks the moment it grows.

Without them, the AI forgets your architecture, re-invents your database, and rewrites
things it already built. With them, it **refers back** to a single source of truth every
time — even in a brand new chat.

## The files
| # | File | What it locks down |
|---|------|--------------------|
| 1 | `architecture.md`    | Solution design, front-end ↔ back-end data flow, APIs, tech stack |
| 2 | `phases.md`          | Features split into build phases (you can't ship it all at once) |
| 3 | `database.md`        | Schema — tables, fields, types, relationships |
| 4 | `prompts.md`         | System + functional prompts for every AI agent in your app |
| 5 | `security.md`        | Auth, validation, secrets, HTTPS/CORS — the security checklist |
| 6 | `error-handling.md`  | Custom error classes, HTTP status codes, response format |

## How to use them (3 steps)
1. **Drop them in your repo.** Put all 6 in a `/docs` folder (or the repo root).
2. **Fill them in** — either by hand, or paste `generator-prompt.md` into your AI with your
   app idea and let it fill all 6 for you.
3. **Point your AI at them.** At the start of every session tell it:
   > "Read `/docs/architecture.md`, `/docs/database.md`, `/docs/phases.md`,
   > `/docs/prompts.md`, `/docs/security.md`, and `/docs/error-handling.md` before writing
   > any code. Keep them updated as we build."

   In Claude Code you can also reference them in `CLAUDE.md` so they load automatically.

## The golden rule
When the AI proposes something that contradicts these files, the **files win** — update the
code, or if the plan genuinely changed, update the file first, then the code. One source of
truth. That's the whole trick.

---
Made this from the reel. Fill it, use it, ship something real. 🚀
