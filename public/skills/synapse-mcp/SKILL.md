---
name: synapse-mcp
description: "Trigger: Synapse MCP, syn_mcp, connect MCP, 401 Bearer, oauth false. Connect to the Synapse Streamable HTTP MCP and list its tools."
---

# Synapse MCP

## Instructions

1. MCP must already be configured in the client. Do not put `syn_mcp_…` in this skill.
2. Remote URL: `{origin}/api/mcp` (production example: `https://synapse-woad-kappa.vercel.app/api/mcp`).
3. Header: `Authorization: Bearer syn_mcp_…`. **No OAuth.** OpenCode: `"oauth": false`. Never run `mcp auth`.
4. On 401: token missing, revoked, or OAuth hijacked the session. Fix config; do not invent tools.
5. First call: `list_workspaces`. If the token is scoped to one workspace, use that `slug`. If several, ask once and reuse.
6. Pass `workspace` as id or slug on every other tool.

## Tools

| Tool | Use |
|------|-----|
| `list_workspaces` | Discover slug/id |
| `list_documents` / `get_document` | Read wiki |
| `create_document` / `update_document` / `delete_document` | Write wiki (reindexes) |
| `list_files` | Indexed uploads |
| `search` | Hybrid FTS + semantic |
| `ask` | RAG answer + citations |
| `list_channels` / `list_recent_messages` | Chat, read-only |
| `get_workspace_stats` / `export_workspace_stats_csv` | Usage |

Prompt `answer_from_workspace` grounds a question in the index.

Wiki writes persist `plain_text` + Yjs. Empty AI key → document still saves, `index_error` on reindex. Free plan: 50 documents. Do not store secrets in the wiki.

## Examples

User: "conecta synapse" → verify MCP tools exist, `list_workspaces`, report slugs. Do not ask them to paste the token into chat.
