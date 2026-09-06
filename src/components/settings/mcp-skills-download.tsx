const SKILLS = [
  {
    id: "synapse-mcp",
    title: "Conectar MCP",
    body: "URL, Bearer, oauth: false, lista de tools. Instálalo primero.",
  },
  {
    id: "synapse-knowledge",
    title: "Fuente de conocimiento",
    body: "Mientras programas, search/ask al wiki y a los PDFs. No inventar fuera del índice.",
  },
  {
    id: "synapse-sdd",
    title: "SDD / Artifact Store",
    body: "Specs, design y tasks como documentos de la wiki (títulos sdd/…).",
  },
  {
    id: "synapse-memory",
    title: "Memoria de vez en cuando",
    body: "Decisiones y bugs del equipo. No en cada mensaje.",
  },
] as const;

export function McpSkillsDownload() {
  return (
    <div className="mt-8 space-y-3 border-t border-line pt-6">
      <h3 className="text-sm font-medium text-paper">Skills para el agente</h3>
      <p className="text-sm leading-relaxed text-mist">
        Descarga el <span className="text-paper">SKILL.md</span> y déjalo en{" "}
        <span className="text-paper">.cursor/skills/&lt;nombre&gt;/</span>,{" "}
        <span className="text-paper">.claude/skills/</span> o la carpeta de skills de OpenCode.
        El token MCP no va dentro del skill.
      </p>
      <ul className="space-y-2">
        {SKILLS.map((skill) => (
          <li
            key={skill.id}
            className="flex flex-col gap-2 rounded-xl border border-line bg-raised/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm text-paper">{skill.title}</p>
              <p className="text-xs leading-relaxed text-mist">{skill.body}</p>
            </div>
            <a
              href={`/skills/${skill.id}/SKILL.md`}
              download={`${skill.id}.md`}
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-raised px-3 text-xs font-medium text-paper hover:bg-line"
            >
              Descargar
            </a>
          </li>
        ))}
      </ul>
      <a href="/skills/README.md" className="inline-block text-xs text-spark hover:underline">
        Cómo instalarlas
      </a>
    </div>
  );
}
