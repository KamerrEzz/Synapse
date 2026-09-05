import { NextResponse } from "next/server";
import { embedTexts } from "@/lib/ai/embed";
import { requireMember } from "@/lib/server/workspace";
import type { SearchHit } from "@/types/database";

export async function POST(request: Request) {
  const body = (await request.json()) as { workspaceId?: string; query?: string };
  if (!body.workspaceId || !body.query) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }
  const ctx = await requireMember(body.workspaceId);
  if (ctx.error) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const [embedding] = await embedTexts([body.query]);
  const { data, error } = await ctx.supabase.rpc("hybrid_search", {
    p_workspace_id: body.workspaceId,
    p_query: body.query,
    p_embedding: embedding,
    p_match_count: 12,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ hits: (data ?? []) as SearchHit[] });
}
