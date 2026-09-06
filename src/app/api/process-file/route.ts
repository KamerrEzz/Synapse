import { NextResponse } from "next/server";
import { chunkText } from "@/lib/ai/chunk";
import { embedForWorkspace } from "@/lib/ai/embed";
import { extractFileText } from "@/lib/ai/extract";
import {
  getWorkspaceAiCred,
  jsonMissingKey,
  MissingAiKeyError,
} from "@/lib/ai/user-key";
import { requireMember } from "@/lib/server/workspace";
import { embedMeta, recordUsage } from "@/lib/stats/record";
import { FREE_PLAN } from "@/lib/plans";

export async function POST(request: Request) {
  const body = (await request.json()) as { fileId?: string; workspaceId?: string };
  if (!body.fileId || !body.workspaceId) {
    return NextResponse.json({ error: "Faltan fileId o workspaceId" }, { status: 400 });
  }

  const ctx = await requireMember(body.workspaceId);
  if (ctx.error || !ctx.user) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const { data: file, error: fileError } = await ctx.supabase
    .from("files")
    .select("*")
    .eq("id", body.fileId)
    .eq("workspace_id", body.workspaceId)
    .maybeSingle();

  if (fileError || !file) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  const { count } = await ctx.supabase
    .from("files")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", body.workspaceId);
  if ((count ?? 0) > FREE_PLAN.maxFiles) {
    await ctx.supabase
      .from("files")
      .update({ status: "error", error_message: "Límite de archivos del plan Free" })
      .eq("id", file.id);
    return NextResponse.json({ error: "Límite de archivos del plan Free" }, { status: 402 });
  }

  try {
    const { data: blob, error: downloadError } = await ctx.supabase.storage
      .from("workspace-files")
      .download(file.path);
    if (downloadError || !blob) throw downloadError ?? new Error("No se pudo descargar");

    const buffer = await blob.arrayBuffer();
    const text = await extractFileText(buffer, file.mime_type, file.name);

    await ctx.supabase
      .from("knowledge_chunks")
      .delete()
      .eq("source_type", "file")
      .eq("source_id", file.id);

    if (!text.trim()) {
      const image = (file.mime_type ?? "").startsWith("image/");
      await ctx.supabase
        .from("files")
        .update({
          status: image ? "ready" : "error",
          error_message: image
            ? null
            : "No se pudo extraer texto. Si es un PDF escaneado, hace falta OCR.",
        })
        .eq("id", file.id);
      return NextResponse.json({ ok: true, chunks: 0 });
    }

    const chunks = chunkText(text);
    let cred;
    try {
      cred = await getWorkspaceAiCred(ctx.supabase, body.workspaceId);
    } catch (err) {
      if (err instanceof MissingAiKeyError) {
        await ctx.supabase
          .from("files")
          .update({ status: "error", error_message: err.message })
          .eq("id", file.id);
        return jsonMissingKey(err);
      }
      throw err;
    }
    const { vectors: embeddings, tokens } = await embedForWorkspace(
      ctx.supabase,
      body.workspaceId,
      chunks,
      cred,
    );
    const rows = chunks.map((content, index) => ({
      workspace_id: body.workspaceId,
      source_type: "file" as const,
      source_id: file.id,
      content,
      embedding: embeddings[index],
      chunk_index: index,
      metadata: { title: file.name, mime_type: file.mime_type },
    }));

    const { error: insertError } = await ctx.supabase.from("knowledge_chunks").insert(rows);
    if (insertError) throw insertError;

    await recordUsage(ctx.supabase, {
      workspaceId: body.workspaceId,
      userId: ctx.user.id,
      kind: "embedding_tokens",
      quantity: tokens,
      meta: embedMeta({
        source: "embed_file",
        provider: cred.provider,
        model: cred.embeddingModel,
        tokens,
      }),
    });
    await recordUsage(ctx.supabase, {
      workspaceId: body.workspaceId,
      userId: ctx.user.id,
      kind: "file_upload",
      quantity: Number(file.size ?? 0),
      meta: { source: "file_upload", estimated_usd: 0 },
    });

    await ctx.supabase
      .from("files")
      .update({ status: "ready", error_message: null })
      .eq("id", file.id);

    return NextResponse.json({ ok: true, chunks: rows.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al procesar";
    await ctx.supabase
      .from("files")
      .update({ status: "error", error_message: message })
      .eq("id", file.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
