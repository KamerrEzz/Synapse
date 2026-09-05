# Synapse

Knowledge base colaborativa, chat en tiempo real y RAG privado por workspace.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind + Supabase (Auth, Postgres, RLS, Realtime, Storage, Edge Functions, pgvector) + Tiptap/Yjs + OpenAI.

## Arranque local

1. Copia [`.env.example`](.env.example) a `.env.local` y rellena:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_SITE_URL` (p.ej. `http://localhost:3000`)
2. En el dashboard de Supabase:
   - Auth: Email, Magic Link, Google y GitHub (redirect `https://<project>.supabase.co/auth/v1/callback` y `http://localhost:3000/auth/callback`)
   - Aplica las migraciones: `npx supabase db push` (proyecto remoto) o `npx supabase start` + reset local
   - Realtime: habilita Authorization para canales privados
   - Secrets de funciones: `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`, `OPENAI_EMBEDDING_MODEL`, `SITE_URL`
3. Instala y corre:

```bash
npm install
npm run dev
```

4. Despliega funciones (opcional; la app usa rutas Next.js `/api/*` en local):

```bash
npx supabase functions deploy process-file
npx supabase functions deploy rag-chat
npx supabase functions deploy invite-member
npx supabase functions deploy create-workspace
npx supabase functions deploy generate-title
```

## Qué hay en el MVP

- Auth: email/contraseña, magic link, Google, GitHub
- Workspaces + roles (owner/admin/member) con RLS
- Documentos colaborativos (Tiptap + Yjs + Realtime Broadcast)
- Chat por canales (`postgres_changes`)
- Archivos → chunks + embeddings
- Chat IA grounded (búsqueda híbrida FTS + pgvector) con citas
- Invitaciones por enlace, búsqueda, límites del plan Free
- Tests de aislamiento documentados en [`supabase/tests/rls.sql`](supabase/tests/rls.sql)

## Seguridad

Nunca pongas `service_role` en el cliente. Las Edge Functions y las rutas `/api` validan JWT y membresía. Los documentos públicos existen en schema pero no se exponen en la UI ni en las policies.
