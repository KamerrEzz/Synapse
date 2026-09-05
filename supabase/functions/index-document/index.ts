import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { json, requireMember } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({});
  const { documentId, workspaceId } = await req.json();
  const ctx = await requireMember(req, workspaceId);
  if ("error" in ctx && ctx.error) return ctx.error;

  const { data: doc } = await ctx.supabase
    .from("documents")
    .select("id, title, plain_text")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return json({ error: "Documento no encontrado" }, 404);

  await ctx.supabase.from("knowledge_chunks").delete().eq("source_type", "document").eq("source_id", documentId);
  const text = doc.plain_text ?? "";
  if (!text.trim()) return json({ ok: true, chunks: 0 });

  const chunks = [text.slice(0, 2800)];
  const OPENAI = Deno.env.get("OPENAI_API_KEY") ?? "";
  const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small",
      input: chunks,
    }),
  });
  const embedJson = await embedRes.json();
  await ctx.supabase.from("knowledge_chunks").insert({
    workspace_id: workspaceId,
    source_type: "document",
    source_id: documentId,
    content: chunks[0],
    embedding: embedJson.data?.[0]?.embedding,
    chunk_index: 0,
    metadata: { title: doc.title },
  });
  return json({ ok: true, chunks: 1 });
});
