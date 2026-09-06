import type { McpServer } from "@modelcontextprotocol/server";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  collectWorkspaceStats,
  compactStatsForAgent,
  parseRangeDays,
} from "@/lib/stats/collect";
import { snapshotToCsv, type ExportKind } from "@/lib/stats/export";
import { csvFilename } from "@/lib/stats/csv";
import { resolveWorkspaceRef, type McpSession } from "@/mcp/auth";

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

function sessionOf(authInfo: AuthInfo | undefined): McpSession {
  const extra = authInfo?.extra as McpSession | undefined;
  if (!extra?.userId) throw new Error("No autenticado");
  return extra;
}

const exportKind = z.enum([
  "resumen",
  "ia",
  "actividad",
  "archivos",
  "documentos",
  "indice",
]);

async function snapshotFor(session: ReturnType<typeof sessionOf>, workspace: string, days?: number) {
  const ws = await resolveWorkspaceRef(session, workspace);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("workspaces")
    .select("id, name, slug, plan, created_at, embedding_dim")
    .eq("id", ws.id)
    .maybeSingle();
  if (error || !data) throw new Error("Workspace no encontrado");
  return collectWorkspaceStats(admin, data, parseRangeDays(String(days ?? 30)), {
    actingUserId: session.userId,
  });
}

export function registerStatsTools(server: McpServer) {
  server.registerTool(
    "get_workspace_stats",
    {
      title: "Get workspace statistics",
      description:
        "Exact workspace analytics: RAG coverage, plan caps, AI token/USD estimates (BYOK, not billed by Synapse), collab, MCP tokens. Default detail=summary omits raw event lists. Use detail=full for per-event rows. days is 7, 30, or 90.",
      inputSchema: z.object({
        workspace: z.string().describe("Workspace id or slug"),
        days: z.coerce.number().int().optional().describe("7, 30, or 90 (default 30)"),
        detail: z.enum(["summary", "full"]).optional(),
      }),
    },
    async ({ workspace, days, detail }, ctx) => {
      try {
        const session = sessionOf(ctx.http?.authInfo);
        const snap = await snapshotFor(session, workspace, days);
        return json(detail === "full" ? snap : compactStatsForAgent(snap));
      } catch (e) {
        return err(e instanceof Error ? e.message : "Error");
      }
    },
  );

  server.registerTool(
    "export_workspace_stats_csv",
    {
      title: "Export workspace statistics CSV",
      description:
        "Return a UTF-8 CSV (BOM) of workspace stats. kind: resumen, ia, actividad, archivos, documentos, indice. Same numbers as the Estadísticas page.",
      inputSchema: z.object({
        workspace: z.string().describe("Workspace id or slug"),
        kind: exportKind,
        days: z.coerce.number().int().optional().describe("7, 30, or 90 (default 30)"),
      }),
    },
    async ({ workspace, kind, days }, ctx) => {
      try {
        const session = sessionOf(ctx.http?.authInfo);
        const snap = await snapshotFor(session, workspace, days);
        const csvKind = kind as ExportKind;
        const csv = snapshotToCsv(snap, csvKind);
        return json({
          filename: csvFilename(snap.workspace.slug, csvKind),
          kind: csvKind,
          days: snap.days,
          csv,
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : "Error");
      }
    },
  );
}
