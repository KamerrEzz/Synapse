import { NextResponse } from "next/server";
import { embedForWorkspace } from "@/lib/ai/embed";
import { hybridSearch } from "@/lib/ai/search";
import {
  getUserAiCred,
  jsonMissingKey,
  MissingAiKeyError,
} from "@/lib/ai/user-key";
import { requireMember } from "@/lib/server/workspace";
import { embedMeta, recordUsage } from "@/lib/stats/record";

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

  const { vectors, tokens } = await embedForWorkspace(
    ctx.supabase,
    body.workspaceId,
    [body.query],
    cred,
  );
  const [embedding] = vectors;
  try {
    const hits = await hybridSearch(ctx.supabase, body.workspaceId, body.query, embedding, 12);
    if (ctx.user) {
      await recordUsage(ctx.supabase, {
        workspaceId: body.workspaceId,
        userId: ctx.user.id,
        kind: "embedding_tokens",
        quantity: tokens,
        meta: embedMeta({
          source: "embed_search",
          provider: cred.provider,
          model: cred.embeddingModel,
          tokens,
        }),
      });
    }
    return NextResponse.json({ hits });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo buscar" },
      { status: 500 },
    );
  }
}
