# Carpeta `supabase/`

Contrato de backend versionado: schema, funciones Deno y tests SQL. La app Next no importa estos archivos en runtime; los aplica el proyecto remoto (o `supabase start` en local).

```
supabase/
├── migrations/     SQL ordenado; fuente de verdad del schema
├── functions/      Edge Functions (Deno), mismo contrato que /api/*
├── tests/rls.sql   Protocolo de aislamiento (dos sesiones)
└── seed.sql        Seed opcional
```

## Migraciones

Aplicar en orden. No reescribir `0001` en producción; añadir archivos nuevos.

| Archivo | Qué hace |
|---------|----------|
| `0001_init.sql` | Extensiones (`vector`, `pg_trgm`, …), tablas, índices, triggers, RLS helpers, RPCs, storage, publication Realtime, `realtime_topic_allowed` |
| `0002_invitation_preview.sql` | `get_invitation_preview` (invitee sin SELECT de invitaciones), `workspace_monthly_ai_tokens` |
| `0003_hybrid_search_plainto.sql` | `hybrid_search` con `plainto_tsquery('spanish', …)` |
| `0004_realtime_auth_policies.sql` | Policies `synapse_realtime_select` / `_insert` en `realtime.messages` |
| `0005_user_openai_keys.sql` | `user_openai_keys` + RPCs de cifrado por usuario |
| `0006_ai_providers.sql` | Proveedor/URL/modelos, `workspaces.embedding_dim`, `hybrid_search` con `vector` sin tamaño fijo, `claim_workspace_embedding_dim` |
| `0007_claim_embedding_dim_if_empty.sql` | Si no hay vectores, se puede cambiar la dimensión (p.ej. tras un indexado fallido) |
| `0008_hybrid_search_return_types.sql` | `hybrid_search`: CTE `hit_*`, `score::double precision` (si no, `structure of query does not match function result type`) |

### `0004` y `realtime.messages`

La tabla es de `supabase_realtime_admin`. RLS ya está habilitado. `ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY` falla con `42501 must be owner of table messages` (SQL Editor y MCP incluidos).

Permitido: `CREATE POLICY` / `DROP POLICY`. `0004` no toca `ALTER TABLE`.

Topics privados:

| Prefijo | Condición (`realtime_topic_allowed`) |
|---------|--------------------------------------|
| `doc:{uuid}` | Miembro del workspace del documento |
| `chat:{uuid}` | Miembro del workspace del canal |
| `workspace:{uuid}` | `is_workspace_member` |

Además: Realtime → Settings → **Allow public access** off.

## Funciones

Cada carpeta es un deploy (`index.ts`). Compartido: `_shared/cors.ts`, `_shared/auth.ts`. JWT verificado (`verify_jwt: true`).

| Función | Equivalente Next | Notas |
|---------|------------------|--------|
| `create-workspace` | RPC `create_workspace` desde el form | Owner + canal `general` |
| `invite-member` | `app/api/invite-member` | Owner/admin; no manda email, devuelve URL `/invite/{token}` |
| `process-file` | `app/api/process-file` | Texto/md en Deno; PDF → usar Next (`unpdf`) |
| `index-document` | `app/api/index-document` | Chunks de `documents.plain_text` |
| `rag-chat` | `app/api/rag-chat` | Next puede streamear tokens; la función devuelve JSON |
| `generate-title` | — | Título corto de conversación IA |

Deploy: `npx supabase functions deploy <nombre>` o MCP `deploy_edge_function`. Secrets: `OPENAI_*`, `SITE_URL`.

## Storage

| Bucket | Público | Path |
|--------|---------|------|
| `workspace-files` | no | `{workspace_id}/…` |
| `avatars` | sí | `{user_id}/…` |

Policies en `0001` (miembros leen/escriben files del workspace; avatar propio).

## Realtime (tablas)

En publication: `messages`, `documents`, `files`, `channels`, `workspace_members` (`replica identity full` donde aplica). Chat usa `postgres_changes`; collab usa Broadcast, no replicar `yjs_state` fila a fila.

## Tests RLS

`supabase/tests/rls.sql`: dos usuarios, dos workspaces; un miembro no lee documentos ni chunks del otro. Ejecutar a mano en SQL Editor (no está en `npm test`).
