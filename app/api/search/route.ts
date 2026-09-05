import { NextResponse } from "next/server";
import { embedForWorkspace } from "@/lib/ai/embed";
import {
  getUserAiCred,
  jsonMissingKey,
  MissingAiKeyError,
} from "@/lib/ai/user-key";
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

  let cred;
  try {
    cred = await getUserAiCred(ctx.supabase);
  } catch (err) {
    if (err instanceof MissingAiKeyError) return jsonMissingKey();
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo usar la clave" },
      { status: 400 },
    );
  }

  const [embedding] = await embedForWorkspace(ctx.supabase, body.workspaceId, [body.query], cred);
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
