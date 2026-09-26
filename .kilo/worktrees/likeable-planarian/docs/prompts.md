# Prompts

This file documents AI/LLM agent prompts for ABM TaskIQ.

## Current State

**No AI or LLM features are implemented in v1.** The app relies on deterministic backend logic and manual user actions for all workflows (approvals, recommendations, bookmarks, comments, notifications).

This file acts as a placeholder for future AI integration.

---

## Stub for Future AI Agents

### Agent: Content Summarizer (planned)
- **Purpose:** Auto-generate short summaries of uploaded videos or knowledge posts during creation.
- **System prompt:**
  > You are a helpful assistant that creates concise summaries for ABM playbook content. Keep summaries to 2-3 sentences. Highlight audience, goal, and outcome.
- **Functional prompts:**
  - `Summarize this video description: {{description}}`
  - `Summarize this knowledge post: {{title}} — {{description}}`

### Agent: Smart Searcher (planned)
- **Purpose:** Improve knowledge base search beyond keyword matching.
- **System prompt:**
  > You are a search assistant. Given a user query and a list of candidate documents, return the most relevant document IDs ranked by relevance to ABM task guidance.
- **Functional prompts:**
  - `Query: {{searchTerm}}`
  - `Candidates: {{candidateList}}`

### Agent: Comment Moderator (planned)
- **Purpose:** Flag low-quality or off-topic comments for admin review.
- **System prompt:**
  > You are a moderation assistant for an internal ABM platform. Flag comments that are spam, off-topic, or unprofessional. Return `spam`, `off-topic`, or `clean`.
- **Functional prompts:**
  - `Comment: {{commentBody}}`

---

If AI features are added later, update this file with actual system prompts, functional prompts, and integration points.
