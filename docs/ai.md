# IA

Cómo está montada la IA en Synapse: BYOK, embeddings, índice híbrido y RAG. Sirve para copiar el mismo contrato a otro producto.

La UI llama a `/api/*`. El modelo **solo** responde con `knowledge_chunks` del workspace. No hay clave compartida en env para Next.

## Quick path

1. El usuario guarda proveedor + key en Ajustes (`POST /api/openai-key`). Next cifra; la UI solo ve `last4`.
2. Archivo → Storage + fila `files` → `POST /api/process-file` (extract, chunk, embed, insert chunks).
3. Documento: `persist_document_state` escribe `plain_text`; `POST /api/index-document` embebe.
4. Pregunta → embed de la query → RPC `hybrid_search` → chat con el contexto (o `(sin resultados)`).
5. Comprobar: Archivos en Error tienen **Reintentar**; un PDF Listo con 0 chunks no está en el índice.

## Contrato

| Pieza | Decisión |
|-------|----------|
| SDK | `openai` con `baseURL` (`lib/ai/provider.ts` → `compatibleClient`) |
| Proveedores | `openai` \| `nan` \| `compatible` (`lib/ai/catalog.ts`) |
| Clave | Por **usuario**, AES-256-GCM en Next (`SYNAPSE_APP_SECRET`) |
| Tabla | `user_openai_keys`: ciphertext, last4, provider, URL, modelos. **Sin SELECT** para `authenticated` |
| Acceso a la key | RPCs `save_own_ai_credential`, `own_openai_key_cipher`, `own_openai_key_meta`, `delete_own_openai_key` |
| Índice | Una tabla `knowledge_chunks` (`file` \| `document`) |
| Dimensión | **Por workspace**, la que **devuelve** el modelo al indexar (`claim_workspace_embedding_dim`) |
| Columna vector | `vector` **sin** tamaño fijo (`0006`). Un dim por workspace una vez hay vectores |
| Búsqueda | RPC `hybrid_search`: RRF (coseno + FTS español) |
| LLM | System prompt: solo el contexto; citar `[#n]` |
| Edge | `supabase/functions/rag-chat` y `process-file` existen para clientes externos; el browser no las llama |
| Agentes | MCP en `/api/mcp` usa el mismo índice vía `mcp_hybrid_search`. CRUD wiki reindexa chunks. Ver [`mcp.md`](./mcp.md) |

NaN (`https://api.nan.builders/v1`) y Helmcode (`https://api.helmcode.com/v1`) son el mismo contrato OpenAI. Chat típico `qwen3.6`; embeddings `qwen3-embedding` (docs dicen 4096; en vivo suele ser **1024**).

## Flujo

```
Ajustes → credencial cifrada
                │
   ┌────────────┼────────────┐
   ▼            ▼            ▼
 Archivo     Documento     Pregunta
 process-file index-document rag-chat
   │            │            │
   └──── embedForWorkspace ──┘
                │
                ▼
     claim_workspace_embedding_dim
                │
                ▼
        knowledge_chunks
                │
                ▼
          hybrid_search
                │
                ▼
         chat.completions (stream)
```

Extract: `lib/ai/extract.ts` (`unpdf` para PDF; texto/md como UTF-8; **imagen → string vacío**, no hay OCR).

Chunks: `lib/ai/chunk.ts` (~2800 caracteres, overlap 400).

Embed: `lib/ai/embed.ts` → `embedTexts` (dim = `vectors[0].length`) → `embedForWorkspace` (claim) → insert.

Búsqueda: `lib/ai/search.ts` → `toSqlVector` (`[0.1,0.2,…]`) → `hybrid_search`.

## BYOK

| Regla | Por qué |
|-------|---------|
| Env wrap: `SYNAPSE_APP_SECRET` (≥32). Alias `OPENAI_KEY_ENCRYPTION_SECRET` aún se acepta | El nombre no debe gritar OpenAI |
| scrypt salt: `synapse-openai-key-v1` | **Cambiar el salt** si se copia a otro producto |
| Payload: `iv(12) + tag(16) + ciphertext` en base64 | AES-256-GCM |
| Next **no** usa `OPENAI_API_KEY` | El usuario paga su uso |
| 409 `missing_ai_key` si no hay credencial | IA, embed y search semántico gated (`AiKeyGate`) |
| `authenticated` no hace SELECT de `user_openai_keys` | La UI nunca ve plaintext |

RPCs `SECURITY DEFINER`. Guardar: `PUT /api/openai-key`. Borrar: `DELETE`.

## Dimensión

1. No imponer `catalog.embeddingDim` ni `user_openai_keys.embedding_dim` contra el vector.
2. Tras un embed OK, `claim_workspace_embedding_dim(workspace, dim_real)`.
3. Si `workspaces.embedding_dim` es null → se escribe.
4. Si coincide → no-op.
5. Si discrepa y **no hay** vectores → se reemplaza (indexado fallido que dejó 4096).
6. Si discrepa y **hay** vectores → error: mismo modelo o borrar chunks.

HNSW fijo a 1536 se **tiró** en `0006`. Search = coseno exacto + FTS (OK a escala de un workspace).

## Indexado

| Fuente | Cuándo | Listo ≠ en el índice |
|--------|--------|----------------------|
| Archivo con texto | Al subir (`process-file`) | Error viejo de dim: pulsar **Reintentar** |
| PDF sin texto (escaneado) | Status `error` | Mensaje de OCR |
| Imagen | Status `ready`, 0 chunks | Badge Listo; no entra a la IA |
| Wiki | Guardar, unmount, debounce 8s | `plain_text` vacío → 0 chunks. `persist` con `''` **pisa** el texto |

`files.status = ready` con 0 chunks (imagen o extract vacío antiguo) no alimenta RAG.

## `hybrid_search`

Firma: `(p_workspace_id uuid, p_query text, p_embedding vector, p_match_count int)`.

RRF: top 20 semántico (`<=>` **y** distancia coseno `< 0.42`) ∪ top 20 FTS (`plainto_tsquery('spanish', …)`).

Sin el umbral, un workspace con pocos chunks siempre rellena resultados semánticos (p.ej. buscar `uziel` devolvía el FAQ de Forge). El FTS sigue saliendo aunque el vecino esté lejos: un nombre propio en el CV no necesita parecerse al embedding de la query.

Al llamar desde JS:

```ts
p_embedding: `[${embedding.join(",")}]`  // no number[]
```

PostgREST no convierte bien un array JS a `vector` en un argumento RPC.

OUT `score` es `double precision`. `1.0 / rank` en Postgres es **numeric**. Sin `::double precision`, `RETURN QUERY` falla: `structure of query does not match function result type`.

En plpgsql, no reutilizar nombres de columnas OUT (`id`, `content`, …) en los CTE; alias `hit_id`, etc. (`0008`).

**No tragar** el `error` del RPC en `rag-chat`. Si se ignora, el modelo responde `(sin resultados)` y parece que no hay PDFs.

## Incidentes (no repetir)

| Síntoma | Causa | Fix |
|---------|--------|-----|
| `El modelo de embeddings devolvió 1024 dimensiones, no 4096` | Se exigía la dim del catálogo (ficha NaN = 4096) **antes** de embed. El run fallido dejaba `embedding_dim = 4096` y 0 chunks | Dim = longitud real; `0007` permite reset si no hay vectores |
| IA: `(sin resultados)` con PDF Listo | Chunks de verdad (p.ej. CV) + RPC roto o ignorado; wiki no indexada al guardar; imágenes Listo sin texto; archivos en Error sin reintento | Vector literal; no tragar error; index al guardar; **Reintentar**; no OCR |
| IA: `structure of query does not match function result type` | `score` numeric vs float8. Solo se veía cuando **sí** había hits | `0008` + cast |
| Buscar un nombre propio trae PDFs sin esa palabra | k-NN top 20 sin umbral de distancia; corpus pequeño siempre rellena | `0009` (`<=>` < 0.42); FTS intacto |
| Archivos Error eternos tras el fix de dim | El mensaje viejo está en `files.error_message`; no se reprocessan solos | `POST /api/process-file` otra vez |
| Wiki con texto y 0 chunks | Index solo a 30s; unmount/Guardar no indexaban | Index en persist + debounce 8s |
| PDF Listo y vacío | Extract vacío se marcaba `ready` | PDF vacío → `error` + mensaje OCR |
| `OPENAI_KEY_ENCRYPTION_SECRET` | Nombre demasiado obvio | `SYNAPSE_APP_SECRET` |
| Edge vs Next en PDF | Deno no corre el mismo `unpdf` | Browser → `/api/process-file` |

## Copiar a otro proyecto

Checklist mínimo:

- [ ] SDK OpenAI + `baseURL`; no atar el producto a un solo vendor.
- [ ] BYOK: cifra en servidor, last4 en UI, RLS sin SELECT de ciphertext, sin fallback a env.
- [ ] Env wrap con nombre genérico; salt scrypt **propio**.
- [ ] `knowledge_chunks` único; `vector` unbounded; dim por tenant **después** del embed.
- [ ] `claim_*_embedding_dim` con reset si el corpus está vacío.
- [ ] RPC search: RRF; `p_embedding` como string `[…]`; `score::float8`; CTE sin nombres OUT; umbral de distancia en k-NN (si no, corpus pequeño rellena basura).
- [ ] Superficie el error del RPC; no rellenar contexto con vacío en silencio.
- [ ] Indexar wiki al persistir, no solo con un timer largo.
- [ ] Imágenes / PDF escaneado: no fingir que están en el índice.
- [ ] UI: Reintentar indexado; copy que Listo en imagen ≠ RAG.
- [ ] Prompt: solo contexto; idioma de la pregunta; citas.
- [ ] Edge Functions opcionales; el path del browser es `/api/*`.

Archivos a mirar en este repo: `lib/ai/*`, `lib/crypto/secret.ts`, `app/api/{openai-key,process-file,index-document,rag-chat,search}/`, `supabase/migrations/0005`–`0009`, `components/settings/openai-key-form.tsx`, `components/ai/ai-key-gate.tsx`.

## Next step

Migraciones y RPCs: [`supabase.md`](./supabase.md). ADRs: [`decisions.md`](./decisions.md). Env: [`environment.md`](./environment.md).
