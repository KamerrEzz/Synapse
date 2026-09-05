**Documento de Proyecto: Synapse**  
**Knowledge Base colaborativa + Chat en tiempo real + RAG con IA**  
Versión 1.0 — Septiembre 2026

---

### 1. Visión del Producto

**Synapse** es una plataforma donde los equipos centralizan su conocimiento, colaboran en documentos en tiempo real, chatean y pueden preguntarle a una IA que responde **solo** con la información de su workspace.

Es la combinación de:
- Notion (documentos + estructura)
- Slack (chat + presencia)
- ChatGPT / Perplexity (pero privado y grounded en tus datos)

El objetivo es que un equipo de 5–50 personas pueda reemplazar Notion + Slack + Drive + ChatGPT interno con una sola herramienta, con seguridad real (RLS multi-tenant) y sin vender sus datos a terceros.

---

### 2. Objetivos del Proyecto

**Técnicos (aprender y demostrar)**
- Usar el 95%+ de las capacidades de Supabase de forma profesional.
- Implementar multi-tenancy real con RLS.
- Combinar Realtime (postgres_changes + presence + broadcast).
- Flujo completo Storage → Edge Function → pgvector.
- RAG production-ready (chunking, embeddings, retrieval + citas).

**Producto**
- MVP usable en 3–4 semanas.
- Experiencia fluida y moderna.
- Base sólida para monetizar (Free / Pro / Team).

---

### 3. Features

#### MVP (Fase 1)
- Autenticación completa (Email + Magic Link + Google/GitHub)
- Creación de Workspaces
- Sistema de miembros + roles (Owner, Admin, Member)
- Invitaciones por email
- Documentos colaborativos en tiempo real
- Chat por workspace (canales)
- Subida de archivos (PDF, MD, TXT, imágenes)
- Procesamiento automático → embeddings
- Chat con IA (RAG) sobre los documentos del workspace
- Búsqueda híbrida (full-text + semántica)
- Perfiles de usuario + avatares

#### Fase 2
- Presencia en documentos (quién está editando)
- Comentarios en documentos
- Historial de versiones
- Notificaciones en tiempo real
- Compartir documentos públicos (links)
- Templates de documentos
- Uso de tokens / límites por plan

#### Fase 3
- Agentes de IA personalizados por workspace
- Integraciones (GitHub, Notion import, Slack)
- Mobile (React Native / Expo)
- Audit log completo
- SSO / SAML (enterprise)

---

### 4. Stack Tecnológico

| Capa              | Tecnología                          |
|-------------------|-------------------------------------|
| Frontend          | Next.js 15/16 (App Router) + TypeScript |
| UI                | Tailwind CSS + shadcn/ui + Lucide   |
| Editor            | Tiptap (con colaboración)           |
| Estado Realtime   | @supabase/supabase-js               |
| Backend           | Supabase (todo)                     |
| Auth              | Supabase Auth                       |
| Base de datos     | PostgreSQL + pgvector + full-text   |
| Storage           | Supabase Storage                    |
| Lógica servidor   | Edge Functions (Deno)               |
| IA                | OpenAI / Anthropic / Grok (vía Edge Functions) |
| Deploy            | Vercel + Supabase                   |
| Monitoreo         | Supabase Dashboard + Sentry         |

---

### 5. Modelo de Datos (Schema Principal)

```sql
-- Extensiones
create extension if not exists "uuid-ossp";
create extension if not exists vector;
create extension if not exists pg_trgm; -- para full-text

-- Perfiles (extiende auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Workspaces
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Miembros
create table public.workspace_members (
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  primary key (workspace_id, user_id)
);

-- Invitaciones
create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  invited_by uuid references public.profiles(id),
  token text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Documentos
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  title text not null default 'Sin título',
  content jsonb default '{}',          -- contenido Tiptap / Yjs
  created_by uuid references public.profiles(id),
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Archivos
create table public.files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  path text not null,                  -- path en Storage
  mime_type text,
  size bigint,
  status text default 'processing' check (status in ('processing', 'ready', 'error')),
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Chunks para RAG
create table public.file_chunks (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references public.files(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  content text not null,
  embedding vector(1536),              -- o 3072 según modelo
  chunk_index int,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Canales de chat
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null,
  is_private boolean default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Mensajes
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.channels(id) on delete cascade,
  user_id uuid references public.profiles(id),
  content text not null,
  created_at timestamptz default now()
);

-- Conversaciones de IA
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id),
  title text,
  created_at timestamptz default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conversations(id) on delete cascade,
  role text check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,                       -- citas de chunks
  created_at timestamptz default now()
);
```

**Índices importantes:**
```sql
create index on file_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index on documents using gin (to_tsvector('spanish', title));
create index on file_chunks using gin (to_tsvector('spanish', content));
```

---

### 6. Row Level Security (Principios clave)

- **Todo** tiene RLS activado.
- Nadie puede ver datos de un workspace al que no pertenece.
- Los owners/admins pueden gestionar miembros e invitaciones.
- Los documentos públicos se pueden leer sin ser miembro (con cuidado).
- Storage policies alineadas con las de la tabla `files`.

Ejemplo de política típica:
```sql
create policy "Members can view documents"
on documents for select
using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid()
  )
  or is_public = true
);
```

---

### 7. Flujos Críticos

**1. Subida de archivo → Embeddings**
1. Usuario sube archivo a Storage (bucket `workspace-files`).
2. Se inserta registro en `files` con status = 'processing'.
3. Trigger o webhook llama a Edge Function `process-file`.
4. Edge Function:
   - Descarga el archivo
   - Extrae texto (PDF → pdf-parse, etc.)
   - Hace chunking inteligente
   - Genera embeddings
   - Inserta en `file_chunks`
   - Actualiza status a 'ready'

**2. Chat con IA (RAG)**
1. Usuario hace pregunta.
2. Edge Function `rag-chat`:
   - Genera embedding de la pregunta
   - Busca los top-k chunks más similares (filtrados por workspace_id)
   - Construye el prompt con contexto + citas
   - Llama al modelo de IA
   - Guarda la conversación + fuentes

**3. Colaboración en documentos**
- Usar Tiptap + Realtime (postgres_changes en la columna `content` o broadcast de operaciones).
- Presencia con `channel.track()`.

---

### 8. Edge Functions principales

| Función              | Responsabilidad                          |
|----------------------|------------------------------------------|
| `process-file`       | Extracción + chunking + embeddings       |
| `rag-chat`           | Retrieval + generación de respuesta      |
| `invite-member`      | Enviar email de invitación               |
| `create-workspace`   | Crear workspace + miembro owner + canal general |
| `generate-title`     | Generar título automático de conversación|

---

### 9. Estructura de carpetas (Next.js)

```
synapse/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   │   ├── [workspace]/
│   │   │   ├── documents/
│   │   │   ├── chat/
│   │   │   ├── files/
│   │   │   ├── ai/
│   │   │   └── settings/
│   ├── api/                  # Route Handlers si se necesitan
│   └── layout.tsx
├── components/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   └── ai/
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed.sql
└── types/
```

---

### 10. Plan de Implementación (recomendado)

**Semana 1 – Fundación**
- Auth completa + perfiles
- Workspaces + miembros + RLS básico
- Layout del dashboard

**Semana 2 – Documentos + Chat**
- CRUD de documentos
- Realtime básico
- Canales y mensajes en tiempo real

**Semana 3 – Storage + RAG**
- Subida de archivos + policies
- Edge Function de procesamiento
- Chat con IA funcional

**Semana 4 – Pulido + UX**
- Presencia
- Búsqueda
- Invitaciones
- Mejoras de UI/UX
- Testing de seguridad RLS

---

### 11. Consideraciones importantes

**Seguridad**
- Nunca usar `service_role` en el cliente.
- Validar siempre `workspace_id` en Edge Functions.
- Rate limiting en funciones de IA.
- Sanitizar contenido de documentos.

**Costos**
- Embeddings y llamadas a LLM son el mayor gasto.
- Usar modelos más baratos para embeddings (text-embedding-3-small).
- Cachear respuestas frecuentes si es posible.
- Límites por plan desde el día 1.

**Escalabilidad**
- Separar tablas de vectores si crece mucho.
- Usar IVFFlat o HNSW según volumen.
- Monitorear uso de Realtime connections.

---

### 12. Métricas de Éxito (MVP)

- Un usuario puede crear un workspace, invitar a alguien y colaborar en un documento en < 3 minutos.
- Subir un PDF de 10 páginas y poder preguntarle sobre él en < 45 segundos.
- RLS pasa todas las pruebas de aislamiento entre workspaces.
- La experiencia se siente “nativa” y rápida.

