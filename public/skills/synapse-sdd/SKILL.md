---
name: synapse-sdd
description: "Trigger: SDD, spec-driven, Artifact Store Policy, proposal, spec, design, tasks, openspec alternative, persist artifacts. Store SDD artifacts in the Synapse wiki via MCP instead of openspec/ or Engram."
---

# Synapse SDD artifact store

Use when the user wants Spec-Driven Development artifacts in Synapse (shared wiki), not `openspec/` files and not Engram.

## Artifact Store Policy

Mode name: `synapse`.

| Phase | Wiki title (exact) |
|-------|-------------------|
| init | `sdd/{project}/init` |
| testing | `sdd/{project}/testing-capabilities` |
| explore | `sdd/{change}/explore` |
| propose | `sdd/{change}/proposal` |
| spec | `sdd/{change}/spec` |
| design | `sdd/{change}/design` |
| tasks | `sdd/{change}/tasks` |
| apply progress | `sdd/{change}/apply-progress` |
| verify | `sdd/{change}/verify-report` |
| archive | `sdd/{change}/archive-report` |

`{project}` = git repo or workspace slug. `{change}` = kebab-case change name (e.g. `add-dark-mode`).

Technical artifact body: English unless the user asked otherwise.

## Persist

1. Requires Synapse MCP. Resolve `workspace` once via `list_workspaces`.
2. `list_documents`. If a doc with that **exact title** exists, `get_document` then `update_document` with the full new `content`.
3. If missing, `create_document` with that title and content.
4. Never create a second doc with a slightly different title. Never `delete_document` an SDD artifact unless the user archives by asking to delete.
5. After write, keep the returned `id` for the rest of the change.
6. If `index_error` appears, the wiki still saved — continue; mention indexing failed.
7. Free plan cap is 50 documents. Reuse titles; do not spawn copies per edit.
8. Do not write `openspec/` unless the user asked for hybrid files + Synapse.

## Retrieve

`search` the title or change name, or `list_documents` and `get_document` by id. `ask` is optional after the docs exist.

## Examples

User: "guarda el spec en synapse" → title `sdd/{change}/spec`, update-or-create, return id + title.
User runs `/sdd-propose` with this skill loaded → persist proposal to `sdd/{change}/proposal` instead of Engram.
