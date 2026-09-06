# Documentación de Synapse

Referencia del sistema: qué hay en el repo, cómo se despliega y qué decisiones están cerradas.

El spec de producto (visión, fases, métricas) está en [`project.md`](../project.md). Este directorio describe la implementación actual. Si `project.md` y el código discrepan, gana el código.

| Documento | Contenido |
|-----------|-----------|
| [architecture.md](./architecture.md) | Capas, rutas, datos, RLS, collab, RAG (resumen) |
| [ai.md](./ai.md) | BYOK, embeddings, índice híbrido, RAG, incidentes; contrato para copiar |
| [environment.md](./environment.md) | Variables, dashboard, Auth, Realtime, SMTP |
| [supabase.md](./supabase.md) | Carpeta `supabase/`, migraciones, funciones, buckets |
| [decisions.md](./decisions.md) | Decisiones cerradas (ADR) |

## Arranque

1. Copiar [`.env.example`](../.env.example) a `.env.local`.
2. Aplicar migraciones en el proyecto Supabase (`0001`–`0009`).
3. `npm install` y `npm run dev` (Next 16 usa `src/proxy.ts`, no `middleware.ts`). El código de la app vive en `src/`.
4. `npm run test:e2e` para Playwright.

## Convenciones para agentes

- No usar `SUPABASE_SERVICE_ROLE_KEY` en cliente ni en código que se envíe al browser.
- Auth de sesión: `src/lib/supabase/{client,server,proxy}.ts`. Gate de workspace: `src/lib/auth.ts`.
- La UI llama a `/api/*`. `supabase/functions/` es la copia desplegable, no el path que usa el browser en local.
- `is_public` en `documents` no entra en RLS ni en la UI.
- IA: ver [`ai.md`](./ai.md). APIs compatibles con OpenAI. Dimensión de embeddings = lo que devuelve el modelo, por workspace.
- UI en español. Commits: conventional commits atómicos.
- `AGENTS.md` / `CLAUDE.md` los regenera `next dev`; no son spec del producto.
