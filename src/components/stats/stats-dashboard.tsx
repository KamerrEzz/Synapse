"use client";

import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ActivityChart,
  CostBarChart,
  MixPie,
  NamedBarChart,
  UsageAreaChart,
} from "@/components/stats/stats-charts";
import { downloadAllCsv, downloadCsv, EXPORT_KINDS } from "@/lib/stats/export";
import { STAT_RANGES, type StatsSnapshot } from "@/lib/stats/types";
import type { ReactNode } from "react";

function formatUsd(value: number) {
  if (value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(6)}`;
  return `$${value.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

function formatTokens(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)} mil`;
  return value.toLocaleString("es");
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function pct(used: number, cap: number) {
  if (!cap) return 0;
  return Math.min(100, (used / cap) * 100);
}

function Meter({
  label,
  used,
  cap,
  format = (n: number) => n.toLocaleString("es"),
}: {
  label: string;
  used: number;
  cap: number;
  format?: (n: number) => string;
}) {
  const p = pct(used, cap);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-mist">{label}</span>
        <span className="text-paper tabular-nums">
          {format(used)} / {format(cap)}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full ${p >= 90 ? "bg-danger" : "bg-spark"}`}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line pt-8 sm:pt-10">
      <h2 className="font-display text-2xl font-medium tracking-tight text-paper sm:text-3xl">
        {title}
      </h2>
      {note ? <p className="mt-1 text-xs leading-relaxed text-mist">{note}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function StatsDashboard({
  snap,
  slug,
}: {
  snap: StatsSnapshot;
  slug: string;
}) {
  const router = useRouter();
  const tokenPct = pct(snap.plan.aiTokensMonth, snap.plan.aiTokensCap);
  const alerts: string[] = [];
  if (snap.knowledge.filesError) {
    alerts.push(`${snap.knowledge.filesError} archivo(s) en error — no entran al RAG.`);
  }
  if (snap.knowledge.docsUnindexed) {
    alerts.push(
      `${snap.knowledge.docsUnindexed} documento(s) con texto sin chunks. Ábrelos o reindexa para que ask/search los vean.`,
    );
  }
  if (tokenPct >= 80) {
    alerts.push(`Vas por el ${tokenPct.toFixed(0)}% del tope Free de tokens este mes.`);
  }
  if (snap.knowledge.filesImages) {
    alerts.push(`${snap.knowledge.filesImages} imagen(es): no se indexan (sin OCR).`);
  }

  const kpis: Array<{
    label: string;
    value: string;
    hint?: string;
    warn?: boolean;
  }> = [
    {
      label: "Coste IA (rango)",
      value: formatUsd(snap.ai.usdInRange),
      hint: `${formatUsd(snap.ai.usdMonth)} este mes · ${formatUsd(snap.ai.usdPerAssistantReply)} / respuesta`,
    },
    {
      label: "Tokens chat este mes",
      value: formatTokens(snap.plan.aiTokensMonth),
      hint: `${tokenPct.toFixed(0)}% de ${formatTokens(snap.plan.aiTokensCap)}`,
      warn: tokenPct >= 90,
    },
    {
      label: "Entrada / salida",
      value: `${formatTokens(snap.ai.promptTokensInRange)} / ${formatTokens(snap.ai.completionTokensInRange)}`,
      hint: snap.ai.eventsWithUsageSplit
        ? `Split real en ${snap.ai.eventsWithUsageSplit} de ${snap.ai.eventsInRange} eventos`
        : "Sin usage de la API en este rango; el coste usa 70/30",
    },
    {
      label: "Índice RAG",
      value: formatTokens(snap.knowledge.chunks),
      hint: `${formatTokens(snap.knowledge.chars)} caracteres · dim ${snap.workspace.embeddingDim ?? "—"}`,
    },
    {
      label: "Cobertura wiki",
      value: `${snap.knowledge.docsIndexed}/${snap.knowledge.docsTotal}`,
      hint: `${snap.knowledge.docsUnindexed} con texto sin indexar`,
      warn: snap.knowledge.docsUnindexed > 0,
    },
    {
      label: "Archivos",
      value: `${snap.knowledge.filesReady} listos`,
      hint: `${snap.plan.files}/${snap.plan.filesCap} · ${formatBytes(snap.knowledge.filesBytes)} · ${snap.knowledge.filesError} error`,
      warn: snap.knowledge.filesError > 0,
    },
    {
      label: "Chat del equipo",
      value: formatTokens(snap.collab.messagesInRange),
      hint: `${snap.collab.messagesTotal} en total · ${snap.collab.uniqueAuthors} autores`,
    },
    {
      label: "Conversaciones IA",
      value: String(snap.collab.aiConversations),
      hint: `${snap.collab.assistantReplies} respuestas · ${Math.round(snap.collab.avgReplyChars)} c. media`,
    },
    {
      label: "Agentes MCP",
      value: String(snap.mcp.active),
      hint: snap.mcp.lastUsedAt
        ? `${snap.mcp.used} usados · último ${new Date(snap.mcp.lastUsedAt).toLocaleString("es")}`
        : "Ningún token usado aún",
    },
  ];

  return (
    <div className="space-y-12 sm:space-y-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Rango">
          {STAT_RANGES.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={snap.days === d ? "default" : "secondary"}
              onClick={() => router.push(`/${slug}/stats?dias=${d}`)}
            >
              {d} días
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {EXPORT_KINDS.map((item) => (
            <Button key={item.id} size="sm" variant="outline" onClick={() => downloadCsv(snap, item.id)}>
              <Download className="h-3.5 w-3.5" />
              {item.label}
            </Button>
          ))}
          <Button size="sm" variant="secondary" onClick={() => downloadAllCsv(snap)}>
            <Download className="h-3.5 w-3.5" />
            Todo
          </Button>
        </div>
      </div>

      {alerts.length ? (
        <ul className="space-y-2 rounded-xl border border-spark/40 bg-spark/10 px-4 py-3 text-sm text-paper">
          {alerts.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="border-t border-line py-5">
            <p className="text-[11px] uppercase tracking-wide text-mist">{kpi.label}</p>
            <p
              className={`mt-1 font-display text-2xl font-medium tracking-tight tabular-nums sm:text-3xl ${
                kpi.warn ? "text-danger" : "text-paper"
              }`}
            >
              {kpi.value}
            </p>
            {kpi.hint ? <p className="mt-1 text-xs leading-relaxed text-mist">{kpi.hint}</p> : null}
          </div>
        ))}
      </div>

      <Section title="Techos del plan Free">
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <Meter
            label="Tokens de chat este mes"
            used={snap.plan.aiTokensMonth}
            cap={snap.plan.aiTokensCap}
            format={formatTokens}
          />
          <Meter label="Archivos" used={snap.plan.files} cap={snap.plan.filesCap} />
          <Meter label="Documentos wiki" used={snap.plan.documents} cap={snap.plan.documentsCap} />
          <Meter label="Miembros" used={snap.plan.members} cap={snap.plan.membersCap} />
        </div>
      </Section>

      <Section
        title="Tokens por día"
        note="Chat/RAG vs embeddings. El eje Y es cantidad de tokens."
      >
        <UsageAreaChart data={snap.series} />
      </Section>

      <Section title="Coste estimado USD" note={snap.ai.caveat}>
        <CostBarChart data={snap.series} />
      </Section>

      <Section
        title="Origen del gasto (USD)"
        note="Coste estimado según la herramienta que disparó el uso."
      >
        <NamedBarChart data={snap.ai.usdBySource} unit="USD" />
      </Section>

      <Section
        title="Actividad del workspace"
        note="Mensajes, respuestas de IA y archivos nuevos."
      >
        <ActivityChart data={snap.series} />
      </Section>

      <Section
        title="Tokens por tipo"
        note={`Chat ${formatTokens(snap.ai.tokensInRange)} · embeddings ${formatTokens(snap.ai.embeddingTokensInRange)}${
          snap.ai.eventsWithUsageSplit
            ? ` · ${snap.ai.eventsWithUsageSplit} eventos con split entrada/salida`
            : ""
        }`}
      >
        <MixPie data={snap.ai.byKind} />
      </Section>

      <Section
        title="Composición del índice"
        note={`Media ${Math.round(snap.knowledge.avgChars).toLocaleString("es")} caracteres por chunk.`}
      >
        <MixPie
          data={[
            { key: "wiki", label: "Wiki", value: snap.knowledge.documentChunks },
            { key: "file", label: "Archivos", value: snap.knowledge.fileChunks },
          ]}
        />
      </Section>

      <Section
        title="Tokens por origen"
        note="Volumen, no dólares. Sirve para ver qué feature consume."
      >
        <NamedBarChart data={snap.ai.bySource} />
      </Section>

      <Section
        title="Modelos usados"
        note="Tokens agrupados por el modelo guardado en cada evento."
      >
        <NamedBarChart data={snap.ai.byModel} />
      </Section>

      <Section title="Tarifa usada para el coste">
        <dl className="grid gap-x-8 gap-y-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-t border-line pt-4">
            <dt className="text-mist">Proveedor</dt>
            <dd className="mt-0.5 text-paper">{snap.ai.pricing.provider}</dd>
          </div>
          <div className="border-t border-line pt-4">
            <dt className="text-mist">Chat</dt>
            <dd className="mt-0.5 text-paper">
              {snap.ai.pricing.chatModel} · ${snap.ai.pricing.chatInputPerM}/{snap.ai.pricing.chatOutputPerM} por 1M
              {snap.ai.pricing.chatExact ? "" : " (referencia)"}
            </dd>
          </div>
          <div className="border-t border-line pt-4">
            <dt className="text-mist">Embeddings</dt>
            <dd className="mt-0.5 text-paper">
              {snap.ai.pricing.embeddingModel} · ${snap.ai.pricing.embedPerM} por 1M
              {snap.ai.pricing.embedExact ? "" : " (referencia)"}
            </dd>
          </div>
          <div className="border-t border-line pt-4">
            <dt className="text-mist">Miembros / docs</dt>
            <dd className="mt-0.5 text-paper tabular-nums">
              {snap.plan.members}/{snap.plan.membersCap} · {snap.plan.documents}/{snap.plan.documentsCap}
            </dd>
          </div>
        </dl>
      </Section>

      <Section title="Coste por persona">
        {snap.ai.byUser.length === 0 ? (
          <p className="text-sm text-mist">Nadie ha disparado eventos de IA en este rango.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-mist">
                <tr>
                  <th className="pb-2 font-medium">Persona</th>
                  <th className="pb-2 font-medium">Tokens</th>
                  <th className="pb-2 font-medium">USD</th>
                  <th className="pb-2 font-medium">% coste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {snap.ai.byUser.map((u) => (
                  <tr key={u.userId}>
                    <td className="py-2 text-paper">{u.name}</td>
                    <td className="py-2 text-mist tabular-nums">{formatTokens(u.tokens)}</td>
                    <td className="py-2 text-paper tabular-nums">{formatUsd(u.usd)}</td>
                    <td className="py-2 text-mist tabular-nums">
                      {snap.ai.usdInRange ? `${((u.usd / snap.ai.usdInRange) * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Desglose por modelo">
        {snap.ai.byModel.length === 0 ? (
          <p className="text-sm text-mist">No hay eventos de IA con modelo en este rango.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-mist">
                <tr>
                  <th className="pb-2 font-medium">Modelo</th>
                  <th className="pb-2 font-medium">Tokens</th>
                  <th className="pb-2 font-medium">USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {snap.ai.byModel.map((m) => (
                  <tr key={m.key}>
                    <td className="py-2 text-paper">{m.label}</td>
                    <td className="py-2 text-mist tabular-nums">{formatTokens(m.value)}</td>
                    <td className="py-2 text-paper tabular-nums">{formatUsd(m.usd ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Fuentes más pesadas del índice">
        {snap.topSources.length === 0 ? (
          <p className="text-sm text-mist">El índice está vacío.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-mist">
                <tr>
                  <th className="pb-2 font-medium">Fuente</th>
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium">Chunks</th>
                  <th className="pb-2 font-medium">Caracteres</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {snap.topSources.map((s) => (
                  <tr key={`${s.sourceType}-${s.sourceId}`}>
                    <td className="max-w-[16rem] truncate py-2 text-paper">{s.title}</td>
                    <td className="py-2 text-mist">{s.sourceType === "file" ? "Archivo" : "Wiki"}</td>
                    <td className="py-2 text-mist tabular-nums">{s.chunks}</td>
                    <td className="py-2 text-mist tabular-nums">{s.chars.toLocaleString("es")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {snap.documents.some((d) => d.chars > 0 && !d.indexed) ? (
        <Section title="Wiki sin indexar">
          <ul className="space-y-1 text-sm text-mist">
            {snap.documents
              .filter((d) => d.chars > 0 && !d.indexed)
              .map((d) => (
                <li key={d.id}>
                  {d.title} · {d.chars.toLocaleString("es")} caracteres
                </li>
              ))}
          </ul>
        </Section>
      ) : null}

      {snap.files.some((f) => f.status === "error") ? (
        <Section title="Archivos en error">
          <ul className="space-y-2 text-sm">
            {snap.files
              .filter((f) => f.status === "error")
              .map((f) => (
                <li key={f.id}>
                  <span className="text-paper">{f.name}</span>
                  <span className="text-danger"> — {f.error || "Error"}</span>
                </li>
              ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}