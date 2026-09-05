# Decisiones

Registro de decisiones cerradas. No reabrirlas en un cambio puntual; si se cambian, actualizar este archivo y el código a la vez.

El spec original está en [`project.md`](../project.md). Varias filas de abajo corrigen ese spec respecto al código.

| ID | Decisión | Por qué | Dónde |
|----|----------|---------|--------|
| D1 | Collab = Tiptap + Yjs CRDT. Sync = Realtime **Broadcast** en canales privados `doc:{id}`. Persistencia = `yjs_state` bytea vía RPCs base64. Sin Hocuspocus | Menos infra; PostgREST no trata bien bytea crudo | `lib/collab/y-supabase-provider.ts`, `get_document_state` / `persist_document_state` |
| D2 | IA = solo OpenAI. Embeddings `text-embedding-3-small` (1536). Chat `OPENAI_CHAT_MODEL` default `gpt-4.1-mini` | Un proveedor, dimensión fija del índice | `lib/ai/provider.ts`, `knowledge_chunks.embedding` |
| D3 | UI en español | Producto | `app/`, `components/` |
| D4 | `documents.is_public` existe y **no** se usa en RLS ni UI | Spec lo planteaba; el MVP no comparte links públicos | policies en `0001`, páginas de documentos |
| D5 | Next.js 16: `proxy.ts`, no `middleware.ts`. `params` como `Promise<{…}>` | Convención actual de Next 16 | `proxy.ts`, páginas del dashboard |
| D6 | RLS helpers `SECURITY DEFINER` (`is_workspace_member`, `has_workspace_role`) | Evitar recursión de policies | `0001_init.sql` |
| D7 | Un solo `knowledge_chunks` (`source_type` file \| document) | Un índice híbrido, no `file_chunks` aparte | `0001`, `/api/process-file`, `/api/index-document` |
| D8 | Hybrid search = RRF (coseno + `plainto_tsquery('spanish', …)`) | FTS + semántica en un RPC | `0003_hybrid_search_plainto.sql` |
| D9 | Invitees no hacen SELECT de invitaciones (RLS admin). Preview = `get_invitation_preview(p_token)` | La página `/invite/[token]` funciona sin membresía | `0002`, `app/invite/[token]/page.tsx` |
| D10 | Browser → `/api/*`. `supabase/functions/` = deploy remoto. PDF se procesa en Next (`unpdf`) | Deno no replica el pipeline PDF local | `app/api/*`, `supabase/functions/process-file` |
| D11 | Storage: `workspace-files` privado, `avatars` público | Archivos del tenant vs foto de perfil | `0001` storage policies |
| D12 | Realtime Authorization: policies en `realtime.messages`, sin `ALTER TABLE` | Dueño `supabase_realtime_admin`; RLS ya on | `0004_realtime_auth_policies.sql` |
| D13 | Chat: pintar el mensaje del `insert` al instante; `postgres_changes` para el resto | Sin Authorization Realtime el remitente no veía su mensaje | `components/chat/chat-room.tsx` |
| D14 | Plan Free con techos en código (`lib/plans.ts`) | Tokens, files, miembros, documentos | `lib/plans.ts`, APIs |

## Fuera de alcance (MVP)

- Hocuspocus / servidor Yjs propio
- Anthropic / Grok u otros LLM
- Documentos públicos por link
- Confirmación de email + SMTP (dev: apagar Confirm email o esperar el tope de 2 correos/h)
- Presencia rica, comentarios, versiones, SSO (fases 2–3 de `project.md`)
