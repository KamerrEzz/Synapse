---
name: synapse-knowledge
description: "Trigger: fuente de conocimiento, knowledge base, wiki del equipo, RAG, search the workspace, don't invent. Ground answers in Synapse wiki and files via MCP search/ask while coding."
---

# Synapse knowledge source

Use when the team's truth lives in Synapse (wiki + indexed PDFs), not only in the current git repo.

## Instructions

1. Requires Synapse MCP (`synapse-mcp`). Resolve `workspace` via `list_workspaces`.
2. Before stating product facts, APIs, domain rules, or "how we do X", call `search` with the user's wording plus filenames/titles you know.
3. If search is thin or the user wants a synthesized answer, call `ask`. Treat citations as the only allowed facts.
4. If tools return no hits or `(sin resultados)`, say the index missed it. Do not fill from training data presented as workspace fact.
5. Prefer `search` for lookup; `ask` when you need a grounded paragraph. Do not dump the whole wiki.
6. File names matter: include them in the query ("certificate", "metodologia.pdf").
7. Indexed images have no text. Scanned PDFs may be missing OCR.
8. After you change code that should match the wiki, mention the gap; do not silently `update_document` unless the user asked to write back.

## Do not

- Invent endpoints, prices, or policies absent from retrieved chunks.
- Paste secrets from files into the transcript.
- Use `delete_document` as part of "just looking up".

## Examples

- "¿cómo autenticamos invitados?" → `search` then answer with wiki/file titles.
- Implementing a feature described in a PDF → `search` the feature name, then code against those chunks.
