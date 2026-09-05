# Entorno

## Variables

Definición: [`.env.example`](../.env.example). Valores reales: `.env.local` (gitignored). Next carga `.env.local` salvo que la variable ya exista en el proceso: un `NEXT_PUBLIC_SUPABASE_*` de la máquina pisa el archivo.

| Variable | Ámbito | Uso |
|----------|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | URL del proyecto (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | JWT anon legacy (`eyJ…`). Evitar `sb_publishable_…` con `@supabase/supabase-js` 2.57 |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor | Admin Auth / bypass RLS. No exponer al cliente |
| `OPENAI_API_KEY` | Server + secrets de Edge Functions | Embeddings y chat |
| `OPENAI_CHAT_MODEL` | Server | Default `gpt-4.1-mini` |
| `OPENAI_EMBEDDING_MODEL` | Server | Default `text-embedding-3-small` (dim 1536) |
| `NEXT_PUBLIC_SITE_URL` | Browser + invite URLs | En local `http://localhost:3000`. Playwright usa `http://127.0.0.1:3000` |

Playwright (`playwright.config.ts`) reescribe `process.env` desde `.env.local` y arranca Next en `127.0.0.1:3000`. `E2E_EMAIL` / `E2E_PASSWORD` tienen default para el usuario de prueba sembrado.

## Dashboard

Proyecto usado en desarrollo: ref `rantlkxgkbjaccehkfie` (nombre de dashboard `authbetter`, `us-west-2`).

| Área | Qué configurar |
|------|----------------|
| Auth → Providers → Email | Password + magic link. **Confirm email** apagado en dev si no hay SMTP; si está on, cada signup consume cuota de correo |
| Auth → URL | `http://localhost:3000/auth/callback` y la URL de producción |
| Auth → Google / GitHub | Redirect `https://<ref>.supabase.co/auth/v1/callback` |
| Auth → Rate Limits | El mailer integrado permite **2 correos/hora** en el proyecto. No sube sin SMTP propio |
| Realtime → Settings | Desactivar **Allow public access** para canales `private: true` |
| Edge Functions → Secrets | `OPENAI_API_KEY`, modelos, `SITE_URL` |
| Storage | Buckets `workspace-files` (privado) y `avatars` (público); los crea `0001` |

Migraciones: CLI (`npx supabase db push`) o SQL Editor. `0004` no incluye `ALTER TABLE` sobre `realtime.messages` (el dueño es `supabase_realtime_admin`; RLS ya está on). Solo `CREATE`/`DROP POLICY`.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run test:e2e
npx playwright install chromium   # una vez
```

Windows: Next 16 puede escuchar en IPv6; Playwright está fijado a `127.0.0.1`. Un segundo `next dev` en el mismo directorio se niega aunque el puerto sea otro.

## E2E

`e2e/landing.spec.ts`, `auth.spec.ts`, `workspace.spec.ts`. El flujo autenticado inicia sesión, crea workspace, documento, mensaje de chat y recorre archivos / IA / buscar / ajustes.

Sin `SUPABASE_SERVICE_ROLE_KEY`, el helper usa `E2E_EMAIL`/`E2E_PASSWORD`. Signup masivo con `@example.com` / `@synapse.test` lo rechaza GoTrue; el mailer integrado rate-limita gmail reales.
