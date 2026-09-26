# Generator Prompt

> Don't want to fill the 6 files by hand? Paste this whole prompt into Claude Code / Cursor /
> Claude, replace the bracketed part with YOUR app idea, and it will generate all 6 files
> filled in for your project. Then review + tweak.

---

```
You are a senior software architect. I'm building this app:

<<< DESCRIBE YOUR APP HERE >>>
- What it does:
- Who it's for:
- Core feature (the one thing it must nail):
- Tech I want to use (or say "you choose"):
- Any AI/LLM features:
- Scale for v1 (rough):

Generate SIX markdown files as my project's source of truth. Use these exact filenames and
sections, filled in specifically for MY app (no generic placeholders — make real decisions,
and note any assumptions):

1. architecture.md  — overview, tech stack (table + why), data-flow diagram, full API list
   (method/route/purpose/auth), integrations, constraints, open questions.
2. phases.md        — split the build into Phase 1 (MVP) → Phase 4 (polish/scale). Each phase
   must be usable on its own, with checklists and which APIs/tables it touches.
3. database.md      — full schema: every table with columns, types, keys, relationships,
   indexes, and conventions.
4. prompts.md       — for each AI agent in my app: purpose, system prompt, and functional
   prompts (the task-level prompts). If no AI features, say so and keep a stub.
5. security.md      — auth, authorization, input validation, secrets, transport/headers,
   rate limiting, and a pre-launch checklist — tailored to my stack.
6. error-handling.md — custom error classes, HTTP status code table, a standard success/error
   response shape, central handler, and logging plan.

Rules:
- Keep them consistent with each other (same table names across architecture ↔ database,
  same endpoints across architecture ↔ error-handling).
- Make concrete choices; flag anything you assumed at the bottom of each file.
- Output each file in its own code block, clearly labeled with its filename.

After generating, list any decisions you need me to confirm.
```

---

**Tip:** Once generated, drop the 6 files in `/docs`, and in every new session tell your AI
to read them first. In Claude Code, reference them from `CLAUDE.md` so they auto-load.
