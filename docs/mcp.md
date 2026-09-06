# MCP

Endpoint Streamable HTTP para que un agente (Cursor, Claude, OpenCode, etc.) lea el workspace: documentos, archivos, búsqueda híbrida, RAG y chat. Auth = token personal Bearer, no OAuth.

## Conectar

1. Ajustes → **Agentes MCP** → crear token (se muestra una vez).
2. El cliente manda `Authorization: Bearer syn_mcp_…`. **No hay OAuth.**

### OpenCode

OpenCode activa OAuth en remotos salvo `oauth: false`. `opencode mcp add --header` **no** pone ese flag: al abrir OpenCode pedirá `mcp auth`. Añádelo a mano o pega el JSON de Ajustes. No uses `opencode mcp auth`.

Comando (con el token ya creado):

```bash
opencode mcp add synapse --url http://localhost:3000/api/mcp --header Authorization="Bearer syn_mcp_…"
```

Luego, en `~/.config/opencode/opencode.json` (o `opencode.json` del proyecto), el bloque tiene que llevar `oauth: false`. OpenCode 2 anida en `mcp.servers`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "synapse": {
        "type": "remote",
        "url": "http://localhost:3000/api/mcp",
        "oauth": false,
        "codemode": false,
        "headers": {
          "Authorization": "Bearer syn_mcp_…"
        }
      }
    }
  }
}
```

Si `mcp add` te escribió el servidor plano bajo `mcp.synapse` (1.x), añade `"oauth": false` en ese objeto. Ajustes copia ambos JSON.

### Cursor

```json
{
  "mcpServers": {
    "synapse": {
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "Authorization": "Bearer syn_mcp_…"
      }
    }
  }
}
```

Clientes solo-stdio: `npx -y mcp-remote http://localhost:3000/api/mcp` con la misma cabecera.

El proxy deja `/api/mcp` y `/.well-known/` públicos (sin cookie). Sin Bearer válido la ruta responde 401. `/.well-known/oauth-authorization-server` responde 404 JSON: este recurso no es un AS.

## Tools

Nombres y descripciones en inglés (contratos para agentes). La UI de Synapse sigue en español.

| Tool | Qué hace |
|------|----------|
| `list_workspaces` | Workspaces que cubre el token (id, slug, rol) |
| `list_documents` | Wiki del workspace (id o slug) |
| `get_document` | Título + `plain_text` por id |
| `list_files` | Archivos indexados |
| `search` | `mcp_hybrid_search` (FTS + semántica, umbral 0.42) |
| `ask` | RAG no streaming + citas. Cuenta tokens del plan Free |
| `list_channels` | Canales de chat |
| `list_recent_messages` | Últimos mensajes de un canal (solo lectura) |

Prompt `answer_from_workspace`: indica al agente que use `search` / `ask` y no invente fuera del índice.

`search` y `ask` usan la clave de IA del **dueño del token** (BYOK). Sin clave: error en el tool result.

## Auth

- Secreto `syn_mcp_` + 32 bytes hex, mostrado una vez en Next.
- En Postgres solo el SHA-256 (`mcp_tokens.token_hash`). RLS: tabla revocada a `authenticated`; alta/lista/revoca vía RPCs `*_own_mcp_token`.
- Resolución: `SUPABASE_SERVICE_ROLE_KEY` en `src/lib/supabase/admin.ts` (obligatoria en `.env.local`; sin ella el lookup del hash falla y OpenCode ve 401). Tras resolver, se comprueba membresía en TypeScript **y** en `mcp_hybrid_search(p_user_id, …)`.
- Alcance: un workspace o todos los del usuario. Un token de un workspace no lee otro.

`hybrid_search` usa `auth.uid()`; el service role no puede llamarla. Por eso existe `mcp_hybrid_search` (solo `service_role`).

## Código

```
src/mcp/auth.ts      mint / hash / sesión
src/mcp/tools.ts     registerTool + prompt
src/mcp/server.ts    HTTP handler + Bearer (sin desafío OAuth)
src/mcp/snippets.ts  JSON/comando Cursor y OpenCode
src/app/api/mcp/route.ts
src/app/api/mcp-tokens/route.ts
src/app/.well-known/oauth-protected-resource/[[...slug]]/route.ts
src/app/.well-known/oauth-authorization-server/[[...slug]]/route.ts
```

Paquetes: `mcp-handler` ^2, `@modelcontextprotocol/server` ^2, `zod` ^4. Protocolo 2026-07-28 + fallback Streamable HTTP 2025.

Metadata RFC 9728 en `/.well-known/oauth-protected-resource` (Bearer header; no hay authorization server).
