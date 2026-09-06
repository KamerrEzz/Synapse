"use client";

import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/layout/page-chrome";
import {
  ActivityChart,
  CostBarChart,
  MixPie,
  NamedBarChart,
  UsageAreaChart,
} from "@/components/stats/stats-charts";
import { downloadAllCsv, downloadCsv, EXPORT_KINDS } from "@/lib/stats/export";
import { STAT_RANGES, type StatsSnapshot } from "@/lib/stats/types";

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
        <span className="text-paper">
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

function Kpi({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-raised/40 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-mist">{label}</p>
      <p className={`mt-1 font-display text-2xl tracking-tight ${warn ? "text-danger" : "text-paper"}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-mist">{hint}</p> : null}
    </div>
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

  return (
    <div className="space-y-6">
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Coste IA (rango)"
          value={formatUsd(snap.ai.usdInRange)}
          hint={`${formatUsd(snap.ai.usdMonth)} este mes · ${formatUsd(snap.ai.usdPerAssistantReply)} / respuesta`}
        />
        <Kpi
          label="Tokens chat este mes"
          value={formatTokens(snap.plan.aiTokensMonth)}
          hint={`${tokenPct.toFixed(0)}% de ${formatTokens(snap.plan.aiTokensCap)}`}
          warn={tokenPct >= 90}
        />
        <Kpi
          label="Entrada / salida"
          value={`${formatTokens(snap.ai.promptTokensInRange)} / ${formatTokens(snap.ai.completionTokensInRange)}`}
          hint={
            snap.ai.eventsWithUsageSplit
              ? `Split real en ${snap.ai.eventsWithUsageSplit} de ${snap.ai.eventsInRange} eventos`
              : "Sin usage de la API en este rango; el coste usa 70/30"
          }
        />
        <Kpi
          label="Índice RAG"
          value={formatTokens(snap.knowledge.chunks)}
          hint={`${formatTokens(snap.knowledge.chars)} caracteres · dim ${snap.workspace.embeddingDim ?? "—"}`}
        />
        <Kpi
          label="Cobertura wiki"
          value={`${snap.knowledge.docsIndexed}/${snap.knowledge.docsTotal}`}
          hint={`${snap.knowledge.docsUnindexed} con texto sin indexar`}
          warn={snap.knowledge.docsUnindexed > 0}
        />
        <Kpi
          label="Archivos"
          value={`${snap.knowledge.filesReady} listos`}
          hint={`${snap.plan.files}/${snap.plan.filesCap} · ${formatBytes(snap.knowledge.filesBytes)} · ${snap.knowledge.filesError} error`}
          warn={snap.knowledge.filesError > 0}
        />
        <Kpi
          label="Chat del equipo"
          value={formatTokens(snap.collab.messagesInRange)}
          hint={`${snap.collab.messagesTotal} en total · ${snap.collab.uniqueAuthors} autores`}
        />
        <Kpi
          label="Conversaciones IA"
          value={String(snap.collab.aiConversations)}
          hint={`${snap.collab.assistantReplies} respuestas · ${Math.round(snap.collab.avgReplyChars)} c. media`}
        />
        <Kpi
          label="Agentes MCP"
          value={String(snap.mcp.active)}
          hint={
            snap.mcp.lastUsedAt
              ? `${snap.mcp.used} usados · último ${new Date(snap.mcp.lastUsedAt).toLocaleString("es")}`
              : "Ningún token usado aún"
          }
        />
      </div>

      <Panel>
        <h2 className="font-display text-xl">Techos del plan Free</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <h2 className="font-display text-xl">Tokens por día</h2>
          <p className="mt-1 text-xs text-mist">Chat/RAG vs embeddings. El eje Y es cantidad de tokens.</p>
          <div className="mt-4">
            <UsageAreaChart data={snap.series} />
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-xl">Coste estimado USD</h2>
          <p className="mt-1 text-xs text-mist">{snap.ai.caveat}</p>
          <div className="mt-4">
            <CostBarChart data={snap.series} />
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-xl">Origen del gasto (USD)</h2>
          <p className="mt-1 text-xs text-mist">Coste estimado según la herramienta que disparó el uso.</p>
          <div className="mt-4">
            <NamedBarChart data={snap.ai.usdBySource} unit="USD" />
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-xl">Actividad del workspace</h2>
          <p className="mt-1 text-xs text-mist">Mensajes, respuestas de IA y archivos nuevos.</p>
          <div className="mt-4">
            <ActivityChart data={snap.series} />
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-xl">Tokens por tipo</h2>
          <p className="mt-1 text-xs text-mist">
            Chat {formatTokens(snap.ai.tokensInRange)} · embeddings {formatTokens(snap.ai.embeddingTokensInRange)}
            {snap.ai.eventsWithUsageSplit
              ? ` · ${snap.ai.eventsWithUsageSplit} eventos con split entrada/salida`
              : ""}
          </p>
          <div className="mt-4">
            <MixPie data={snap.ai.byKind} />
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-xl">Composición del índice</h2>
          <p className="mt-1 text-xs text-mist">
            Media {Math.round(snap.knowledge.avgChars).toLocaleString("es")} caracteres por chunk.
          </p>
          <div className="mt-4">
            <MixPie
              data={[
                { key: "wiki", label: "Wiki", value: snap.knowledge.documentChunks },
                { key: "file", label: "Archivos", value: snap.knowledge.fileChunks },
              ]}
            />
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-xl">Tokens por origen</h2>
          <p className="mt-1 text-xs text-mist">Volumen, no dólares. Sirve para ver qué feature consume.</p>
          <div className="mt-4">
            <NamedBarChart data={snap.ai.bySource} />
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-xl">Modelos usados</h2>
          <p className="mt-1 text-xs text-mist">Tokens agrupados por el modelo guardado en cada evento.</p>
          <div className="mt-4">
            <NamedBarChart data={snap.ai.byModel} />
          </div>
        </Panel>
      </div>

      <Panel>
        <h2 className="font-display text-xl">Tarifa usada para el coste</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-mist">Proveedor</dt>
            <dd className="text-paper">{snap.ai.pricing.provider}</dd>
          </div>
          <div>
            <dt className="text-mist">Chat</dt>
            <dd className="text-paper">
              {snap.ai.pricing.chatModel} · ${snap.ai.pricing.chatInputPerM}/${snap.ai.pricing.chatOutputPerM} por 1M
              {snap.ai.pricing.chatExact ? "" : " (referencia)"}
            </dd>
          </div>
          <div>
            <dt className="text-mist">Embeddings</dt>
            <dd className="text-paper">
              {snap.ai.pricing.embeddingModel} · ${snap.ai.pricing.embedPerM} por 1M
              {snap.ai.pricing.embedExact ? "" : " (referencia)"}
            </dd>
          </div>
          <div>
            <dt className="text-mist">Miembros / docs</dt>
            <dd className="text-paper">
              {snap.plan.members}/{snap.plan.membersCap} · {snap.plan.documents}/{snap.plan.documentsCap}
            </dd>
          </div>
        </dl>
      </Panel>

      <Panel>
        <h2 className="font-display text-xl">Coste por persona</h2>
        {snap.ai.byUser.length === 0 ? (
          <p className="mt-3 text-sm text-mist">Nadie ha disparado eventos de IA en este rango.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
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
                    <td className="py-2 text-mist">{formatTokens(u.tokens)}</td>
                    <td className="py-2 text-paper">{formatUsd(u.usd)}</td>
                    <td className="py-2 text-mist">
                      {snap.ai.usdInRange ? `${((u.usd / snap.ai.usdInRange) * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel>
        <h2 className="font-display text-xl">Desglose por modelo</h2>
        {snap.ai.byModel.length === 0 ? (
          <p className="mt-3 text-sm text-mist">No hay eventos de IA con modelo en este rango.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
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
                    <td className="py-2 text-mist">{formatTokens(m.value)}</td>
                    <td className="py-2 text-paper">{formatUsd(m.usd ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel>
        <h2 className="font-display text-xl">Fuentes más pesadas del índice</h2>
        {snap.topSources.length === 0 ? (
          <p className="mt-3 text-sm text-mist">El índice está vacío.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
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
                    <td className="py-2 text-mist">{s.chunks}</td>
                    <td className="py-2 text-mist">{s.chars.toLocaleString("es")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {snap.documents.some((d) => d.chars > 0 && !d.indexed) ? (
        <Panel>
          <h2 className="font-display text-xl">Wiki sin indexar</h2>
          <ul className="mt-3 space-y-1 text-sm text-mist">
            {snap.documents
              .filter((d) => d.chars > 0 && !d.indexed)
              .map((d) => (
                <li key={d.id}>
                  {d.title} · {d.chars.toLocaleString("es")} caracteres
                </li>
              ))}
          </ul>
        </Panel>
      ) : null}

      {snap.files.some((f) => f.status === "error") ? (
        <Panel>
          <h2 className="font-display text-xl">Archivos en error</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {snap.files
              .filter((f) => f.status === "error")
              .map((f) => (
                <li key={f.id}>
                  <span className="text-paper">{f.name}</span>
                  <span className="text-danger"> — {f.error || "Error"}</span>
                </li>
              ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
