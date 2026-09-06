# Decisiones

Registro de decisiones cerradas. No reabrirlas en un cambio puntual; si se cambian, actualizar este archivo y el código a la vez.

El spec original está en [`project.md`](../project.md). Varias filas de abajo corrigen ese spec respecto al código.

| ID | Decisión | Por qué | Dónde |
|----|----------|---------|--------|
| D1 | Collab = Tiptap + Yjs CRDT. Sync = Realtime **Broadcast** en canales privados `doc:{id}`. Persistencia = `yjs_state` bytea vía RPCs base64. Sin Hocuspocus | Menos infra; PostgREST no trata bien bytea crudo | `src/lib/collab/y-supabase-provider.ts`, `get_document_state` / `persist_document_state` |
| D2 | IA = APIs **compatibles con OpenAI** (OpenAI, NaN, URL propia). Chat y embeddings los elige cada usuario. Dimensión del índice **por workspace**, la que devuelve el API (no la ficha del catálogo) | Un SDK, varios proveedores; NaN documenta 4096 y a menudo da 1024 | `src/lib/ai/*`, `claim_workspace_embedding_dim`. Detalle: [`ai.md`](./ai.md) |
| D3 | UI en español | Producto | `src/app/`, `src/components/` |
| D4 | `documents.is_public` existe y **no** se usa en RLS ni UI | Spec lo planteaba; el MVP no comparte links públicos | policies en `0001`, páginas de documentos |
| D5 | Next.js 16: `src/proxy.ts`, no `middleware.ts`. `params` como `Promise<{…}>` | Convención actual de Next 16 | `src/proxy.ts`, páginas del dashboard |
| D6 | RLS helpers `SECURITY DEFINER` (`is_workspace_member`, `has_workspace_role`) | Evitar recursión de policies | `0001_init.sql` |
| D7 | Un solo `knowledge_chunks` (`source_type` file \| document) | Un índice híbrido, no `file_chunks` aparte | `0001`, `/api/process-file`, `/api/index-document` |
| D8 | Hybrid search = RRF (coseno + `plainto_tsquery('spanish', …)`). `p_embedding` como literal `[…]`. `score::float8`. Semántica solo si `<=>` < 0.42 | FTS + semántica; sin umbral el k-NN rellena con documentos irrelevantes en corpus pequeño | `0003`, `0006`, `0008`, `0009`, `src/lib/ai/search.ts` |
| D9 | Invitees no hacen SELECT de invitaciones (RLS admin). Preview = `get_invitation_preview(p_token)` | La página `/invite/[token]` funciona sin membresía | `0002`, `src/app/invite/[token]/page.tsx` |
| D10 | Browser → `/api/*`. `supabase/functions/` = deploy remoto. PDF se procesa en Next (`unpdf`) | Deno no replica el pipeline PDF local | `src/app/api/*`, `supabase/functions/process-file` |
| D11 | Storage: `workspace-files` privado, `avatars` público | Archivos del tenant vs foto de perfil | `0001` storage policies |
| D12 | Realtime Authorization: policies en `realtime.messages`, sin `ALTER TABLE` | Dueño `supabase_realtime_admin`; RLS ya on | `0004_realtime_auth_policies.sql` |
| D13 | Chat: pintar el mensaje del `insert` al instante; `postgres_changes` para el resto | Sin Authorization Realtime el remitente no veía su mensaje | `src/components/chat/chat-room.tsx` |
| D14 | Plan Free con techos en código (`src/lib/plans.ts`) | Tokens, files, miembros, documentos | `src/lib/plans.ts`, APIs |
| D15 | BYOK: cada usuario guarda proveedor + URL + modelos + API key. AES-256-GCM en Next (`SYNAPSE_APP_SECRET`). Tabla `user_openai_keys` sin SELECT para `authenticated`. UI solo ve last4. Sin fallback a env | El usuario paga su uso; no hay clave compartida del producto | `0005`/`0006`, `src/lib/crypto/secret.ts`, `/api/openai-key` |
| D16 | Dimensión: `vectors[0].length` tras embed OK, luego `claim_workspace_embedding_dim`. Si no hay vectores, se puede reemplazar una dim de un run fallido | Catálogo ≠ API; un workspace, un dim cuando ya hay chunks | `0007`, `src/lib/ai/embed.ts` |
| D17 | No tragar errores de `hybrid_search` en RAG. Wiki se indexa al guardar/unmount, no solo con timer | `(sin resultados)` falso; documentos con texto y 0 chunks | `src/app/api/rag-chat`, `collaborative-editor.tsx` |
| D18 | Editor de documentos: columna sobre `ink` (no hoja crema). Título en la página, toolbar de formato, retícula `max-w-5xl` | Encaje con el dashboard | `collaborative-editor.tsx`, `globals.css` |
| D19 | Shell `h-dvh`; sidebar persistente desde `lg`; debajo, barra + drawer. Chat/IA: segundo panel en `md`. Padding `px-4` → `sm:px-8` | El sidebar de 248px no cabe en móvil | `workspace-shell.tsx`, `split-nav.tsx` |
| D20 | App Router bajo `src/` (`src/app`, `src/components`, `src/lib`, `src/types`, `src/proxy.ts`). Alias `@/*` → `./src/*` | Separar código de producto de `docs/`, `supabase/`, `e2e/` y config | `tsconfig.json`, `components.json` |
| D21 | MCP Streamable HTTP en `/api/mcp`. Auth = token personal `syn_mcp_…` (hash SHA-256). Tools en inglés. `mcp_hybrid_search(p_user_id)` solo `service_role`. Sin OAuth | Los agentes no tienen cookie de sesión; `hybrid_search` exige `auth.uid()` | `src/mcp/*`, `0010_mcp_tokens.sql`. Detalle: [`mcp.md`](./mcp.md) |

## Fuera de alcance (MVP)

- Hocuspocus / servidor Yjs propio
- Anthropic / Grok u otros LLM
- Documentos públicos por link
- Confirmación de email + SMTP (dev: apagar Confirm email o esperar el tope de 2 correos/h)
- Presencia rica, comentarios, versiones, SSO (fases 2–3 de `project.md`)
