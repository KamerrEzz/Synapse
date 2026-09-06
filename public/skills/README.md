# Skills de Synapse para agentes

Copia cada carpeta a tu agente (hace falta un token MCP en Ajustes → Agentes MCP).

| Skill | Cuándo |
|-------|--------|
| `synapse-mcp` | Conectar el servidor. Léela primero. |
| `synapse-knowledge` | El wiki/archivos del equipo son la fuente de verdad mientras programas. |
| `synapse-sdd` | SDD / Artifact Store: specs, design, tasks en la wiki. |
| `synapse-memory` | Decisiones y gotchas de vez en cuando (no en cada mensaje). |

## Dónde pegarlas

- **Cursor:** `.cursor/skills/<nombre>/SKILL.md` en el repo, o tu Agent Store.
- **Claude Code:** `~/.claude/skills/<nombre>/SKILL.md` o `.claude/skills/` del proyecto.
- **OpenCode:** la carpeta `skills/` que use tu config.

No pongas el token `syn_mcp_…` dentro del skill. El Bearer va en la config MCP.

Producción: `https://synapse-woad-kappa.vercel.app/api/mcp`
