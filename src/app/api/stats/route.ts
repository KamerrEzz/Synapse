import { NextResponse } from "next/server";
import { requireMember } from "@/lib/server/workspace";
import { collectWorkspaceStats, parseRangeDays } from "@/lib/stats/collect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId");
  const days = parseRangeDays(url.searchParams.get("dias") ?? undefined);
  if (!workspaceId) {
    return NextResponse.json({ error: "Falta workspaceId" }, { status: 400 });
  }
  const ctx = await requireMember(workspaceId);
  if (ctx.error || !ctx.user) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const { data: workspace, error } = await ctx.supabase
    .from("workspaces")
    .select("id, name, slug, plan, created_at, embedding_dim")
    .eq("id", workspaceId)
    .maybeSingle();
  if (error || !workspace) {
    return NextResponse.json({ error: "Workspace no encontrado" }, { status: 404 });
  }
  try {
    const snap = await collectWorkspaceStats(ctx.supabase, workspace, days);
    return NextResponse.json(snap);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudieron leer las estadísticas" },
      { status: 500 },
    );
  }
}
