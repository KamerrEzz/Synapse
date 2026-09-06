import type { StatsSnapshot } from "@/lib/stats/types";
import { csvFilename, toCsv } from "@/lib/stats/csv";

export type ExportKind = "resumen" | "ia" | "actividad" | "archivos" | "documentos" | "indice";

export const EXPORT_KINDS: { id: ExportKind; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "ia", label: "Uso y coste de IA" },
  { id: "actividad", label: "Actividad diaria" },
  { id: "archivos", label: "Archivos" },
  { id: "documentos", label: "Documentos" },
  { id: "indice", label: "Índice RAG" },
];

export function snapshotToCsv(snap: StatsSnapshot, kind: ExportKind) {
  switch (kind) {
    case "resumen":
      return toCsv(
        ["metrica", "valor"],
        [
          ["workspace", snap.workspace.name],
          ["slug", snap.workspace.slug],
          ["plan", snap.workspace.plan],
          ["rango_dias", snap.days],
          ["generado", snap.generatedAt],
          ["tokens_mes", snap.plan.aiTokensMonth],
          ["tope_tokens", snap.plan.aiTokensCap],
          ["usd_mes", snap.ai.usdMonth.toFixed(6)],
          ["usd_rango", snap.ai.usdInRange.toFixed(6)],
          ["usd_por_respuesta", snap.ai.usdPerAssistantReply.toFixed(6)],
          ["tokens_chat_rango", snap.ai.tokensInRange],
          ["tokens_embed_rango", snap.ai.embeddingTokensInRange],
          ["tokens_entrada", snap.ai.promptTokensInRange],
          ["tokens_salida", snap.ai.completionTokensInRange],
          ["eventos_con_split", snap.ai.eventsWithUsageSplit],
          ["documentos", snap.plan.documents],
          ["docs_indexados", snap.knowledge.docsIndexed],
          ["docs_sin_indexar", snap.knowledge.docsUnindexed],
          ["archivos", snap.plan.files],
          ["archivos_error", snap.knowledge.filesError],
          ["miembros", snap.plan.members],
          ["chunks", snap.knowledge.chunks],
          ["chunks_wiki", snap.knowledge.documentChunks],
          ["chunks_archivo", snap.knowledge.fileChunks],
          ["chars_indice", snap.knowledge.chars],
          ["mensajes", snap.collab.messagesTotal],
          ["conversaciones_ia", snap.collab.aiConversations],
          ["tokens_mcp_activos", snap.mcp.active],
          ["proveedor", snap.ai.pricing.provider],
          ["modelo_chat", snap.ai.pricing.chatModel],
          ["modelo_embed", snap.ai.pricing.embeddingModel],
        ],
      );
    case "ia":
      return toCsv(
        ["id", "fecha", "tipo", "origen", "modelo", "tokens", "prompt", "completion", "usd", "usuario"],
        snap.events.map((e) => [
          e.id,
          e.createdAt,
          e.kind,
          e.source,
          e.model,
          e.quantity,
          e.promptTokens,
          e.completionTokens,
          e.usd.toFixed(8),
          e.userId ?? "",
        ]),
      );
    case "actividad":
      return toCsv(
        ["dia", "tokens_chat", "tokens_embed", "usd", "mensajes", "archivos", "documentos", "respuestas_ia"],
        snap.series.map((d) => [
          d.day,
          d.tokens,
          d.embeddingTokens,
          d.usd.toFixed(6),
          d.messages,
          d.files,
          d.documents,
          d.aiTurns,
        ]),
      );
    case "archivos":
      return toCsv(
        ["id", "nombre", "mime", "estado", "bytes", "creado", "error"],
        snap.files.map((f) => [f.id, f.name, f.mime ?? "", f.status, f.size, f.createdAt, f.error ?? ""]),
      );
    case "documentos":
      return toCsv(
        ["id", "titulo", "caracteres", "indexado", "actualizado", "autor"],
        snap.documents.map((d) => [
          d.id,
          d.title,
          d.chars,
          d.indexed ? "si" : "no",
          d.updatedAt,
          d.createdBy ?? "",
        ]),
      );
    case "indice":
      return toCsv(
        ["tipo", "id", "titulo", "chunks", "caracteres"],
        snap.topSources.map((s) => [s.sourceType, s.sourceId, s.title, s.chunks, s.chars]),
      );
    default:
      return toCsv(["error"], [["kind"]]);
  }
}

export function downloadCsv(snap: StatsSnapshot, kind: ExportKind) {
  const csv = snapshotToCsv(snap, kind);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = csvFilename(snap.workspace.slug, kind);
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadAllCsv(snap: StatsSnapshot) {
  EXPORT_KINDS.forEach((item, i) => {
    window.setTimeout(() => downloadCsv(snap, item.id), i * 280);
  });
}
