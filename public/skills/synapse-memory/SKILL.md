---
name: synapse-memory
description: "Trigger: remember in Synapse, guarda esto, decisión, gotcha, convention, session note, memoria del equipo. Persist occasional decisions and bugs as wiki notes via MCP, not every turn."
---

# Synapse occasional memory

Use when the user wants a durable **team** note in Synapse. Skip routine chatter, secrets, and anything already in git.

## When to write

- User says remember / guarda / anótalo en synapse.
- A closed decision, bug root cause, or convention that the next agent would miss.
- End of a session if they ask for a summary in the wiki.

## When not to write

- Every assistant turn.
- API keys, tokens, passwords, personal data from uploaded files.
- Content that belongs in an SDD artifact (`synapse-sdd`) — use that skill instead.
- Purely local git history.

## How

1. Requires Synapse MCP. Resolve `workspace` via `list_workspaces`.
2. Title: `memory/{project}/{topic}` in kebab-case, max 200 chars. Examples: `memory/synapse/android-chrome-upload`, `memory/estudio-norte/shared-ai-key`.
3. `list_documents`. Same title → `update_document` (replace or append a dated section). New topic → `create_document`.
4. Body: short. **What / Why / Where / Learned**. English or Spanish matching the user.
5. After saving, `search` is enough later; do not re-read the whole wiki each turn.
6. One note per topic. Do not create `memory/...-2`.

## Examples

- "acuérdate que el workspace comparte la clave del owner" → create/update `memory/{project}/shared-ai-key`.
- Implementing a fix → only write if they ask, or if they want the bug recorded for the team.
