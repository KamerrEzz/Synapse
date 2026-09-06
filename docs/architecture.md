# Arquitectura

Synapse es una app Next.js 16 (App Router) con backend en Supabase: Auth, Postgres + RLS, Realtime, Storage, Edge Functions y pgvector. Cada workspace es un tenant. La IA solo responde con chunks de ese workspace.

## Capas

| Capa | Dónde | Rol |
|------|--------|-----|
| UI | `src/app/`, `src/components/` | Rutas App Router, UI en español |
| Proxy | `src/proxy.ts` → `src/lib/supabase/proxy.ts` | Refresco de sesión y redirects |
| Clientes Supabase | `src/lib/supabase/client.ts`, `server.ts` | Anon key + cookies (`@supabase/ssr`) |
| APIs Next | `src/app/api/*` | JWT + membresía; OpenAI en el servidor |
| MCP | `src/mcp/`, `/api/mcp` | Streamable HTTP para agentes (Bearer) |
| Admin | `src/lib/supabase/admin.ts` | `service_role` solo servidor (MCP) |
| Postgres | `supabase/migrations/` | Tablas, RLS, RPCs |
| Edge Functions | `supabase/functions/` | Mismo contrato que `/api/*` para deploy remoto |
| Collab | `src/lib/collab/y-supabase-provider.ts` | Yjs por Broadcast privado |
| RAG | `src/lib/ai/*`, `hybrid_search` | Chunks, embeddings, RRF |

El navegador no llama a Edge Functions. En local, PDF/texto y RAG van por Next (`unpdf` no corre igual en Deno).

## Rutas

```
/                          landing (pública)
/login                     auth
/auth/callback             OAuth / magic link
/invite/[token]            preview + accept (pública hasta login)
/workspaces                lista y alta de workspace
/[workspace]/documents     wiki
/[workspace]/documents/[id] editor Yjs
/[workspace]/chat/[channelId]
/[workspace]/files
/[workspace]/ai
/[workspace]/search
/[workspace]/settings
/api/mcp                   MCP Streamable HTTP (Bearer, sin cookie)
/.well-known/oauth-protected-resource
```

Públicas para el proxy: `/`, `/login`, `/auth/*`, `/invite/*`, `/api/mcp`, `/.well-known/*`. El resto exige sesión. Usuario autenticado en `/` o `/login` → `/workspaces`.

`src/app/(dashboard)/[workspace]/layout.tsx` es `force-dynamic` y resuelve el slug con `getWorkspaceBySlug`. El chrome es `WorkspaceShell`: sidebar fijo desde `lg`, barra + drawer debajo.

## Datos

Tenant = `workspaces` + `workspace_members` (roles `owner` | `admin` | `member`).

| Tabla | Uso |
|-------|-----|
| `profiles` | Alta vía trigger `handle_new_user` sobre `auth.users` |
| `workspace_invitations` | Token; `accepted_at` al aceptar |
| `documents` | `plain_text` + `yjs_state` (bytea); `is_public` sin efecto |
| `files` | Metadatos; blob en Storage `workspace-files/{workspace_id}/...` |
| `knowledge_chunks` | `source_type` `file` \| `document`, embedding (dimensión del workspace) |
| `channels` / `messages` | Chat; canal `general` al crear workspace |
| `ai_conversations` / `ai_messages` | RAG + `sources` jsonb |
| `user_openai_keys` | Ciphertext AES-GCM + last4; sin SELECT directo |
| `mcp_tokens` | Hash SHA-256 del secreto MCP; last4; alcance opcional por workspace |
| `usage_events` | Tokens IA (`kind = ai_tokens`) |

RPCs relevantes: `create_workspace`, `accept_invitation`, `get_invitation_preview`, `get_document_state`, `persist_document_state`, `hybrid_search`, `mcp_hybrid_search` (solo `service_role`), `list_own_mcp_tokens`, `insert_own_mcp_token`, `revoke_own_mcp_token`, `workspace_monthly_ai_tokens`, `is_workspace_member`, `has_workspace_role`, `realtime_topic_allowed`, `save_own_ai_credential`, `own_openai_key_meta`, `own_openai_key_cipher`, `delete_own_openai_key`, `claim_workspace_embedding_dim`.

Límites Free: `src/lib/plans.ts` (100k tokens/mes, 25 archivos, 10 miembros, 50 documentos).

Código de aplicación en `src/` (`app`, `components`, `lib`, `mcp`, `types`, `proxy.ts`). `public/`, `supabase/`, `docs/` y config quedan en la raíz. Detalle MCP: [`mcp.md`](./mcp.md).

## RLS

Todas las tablas Synapse tienen RLS. Las policies de tenant llaman a `is_workspace_member` / `has_workspace_role` (`SECURITY DEFINER`) para no recurar.

El cliente usa la anon key; el aislamiento es la policy, no un rol distinto por usuario. `service_role` solo en servidor/admin, nunca en el browser.

Protocolo manual de aislamiento: `supabase/tests/rls.sql`.

## Collab (documentos)

Tiptap + Yjs. Sync: canal privado `doc:{documentId}` (Broadcast: `yjs-update`, `awareness`, `sync-request`). Persistencia: `persist_document_state` (estado Yjs en base64 → bytea) con debounce ~1.8s. Carga: `get_document_state`.

Autorización Realtime: policies en `realtime.messages` + `realtime_topic_allowed()` (topics `doc:`, `chat:`, `workspace:`).

## Chat

Insert en `public.messages`. El remitente pinta el row del `insert … select`. Los demás: `postgres_changes` en un canal privado `chat:{channelId}`.

## RAG

Detalle (BYOK, dim, RPC, incidentes, checklist para otro repo): [`ai.md`](./ai.md).

1. Archivo → Storage + fila `files` → `POST /api/process-file` (extract, chunk, embed, `knowledge_chunks`).
2. Documento: `POST /api/index-document` sobre `plain_text` (al guardar / unmount / ~8s).
3. Pregunta → embedding → `hybrid_search` (RRF: coseno con distancia `< 0.42` + `plainto_tsquery('spanish', …)`) → chat con instrucción de no inventar fuera del contexto → citas en `ai_messages.sources`.

La clave es por usuario (BYOK). Next cifra con AES-256-GCM (`SYNAPSE_APP_SECRET`); no hay fallback a `OPENAI_API_KEY`. Sin clave: 409 `missing_ai_key`. El workspace fija la dimensión con lo que **devuelve el modelo** (`claim_workspace_embedding_dim`). Los presets del catálogo no se imponen (`qwen3-embedding` suele ser 1024, no 4096).
