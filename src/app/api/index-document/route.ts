import { NextResponse } from "next/server";
import { chunkText } from "@/lib/ai/chunk";
import { embedForWorkspace } from "@/lib/ai/embed";
import {
  getUserAiCred,
  jsonMissingKey,
  MissingAiKeyError,
} from "@/lib/ai/user-key";
import { requireMember } from "@/lib/server/workspace";

export async function POST(request: Request) {
  const body = (await request.json()) as { documentId?: string; workspaceId?: string };
  if (!body.documentId || !body.workspaceId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const ctx = await requireMember(body.workspaceId);
  if (ctx.error || !ctx.user) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const { data: doc } = await ctx.supabase
    .from("documents")
    .select("id, title, plain_text, workspace_id")
    .eq("id", body.documentId)
    .eq("workspace_id", body.workspaceId)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  await ctx.supabase
    .from("knowledge_chunks")
    .delete()
    .eq("source_type", "document")
    .eq("source_id", doc.id);

  const chunks = chunkText(doc.plain_text || "");
  if (chunks.length === 0) {
    return NextResponse.json({ ok: true, chunks: 0 });
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

  const embeddings = await embedForWorkspace(ctx.supabase, body.workspaceId, chunks, cred);
  const rows = chunks.map((content, index) => ({
    workspace_id: body.workspaceId,
    source_type: "document" as const,
    source_id: doc.id,
    content,
    embedding: embeddings[index],
    chunk_index: index,
    metadata: { title: doc.title },
  }));

  const { error } = await ctx.supabase.from("knowledge_chunks").insert(rows);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, chunks: rows.length });
}
