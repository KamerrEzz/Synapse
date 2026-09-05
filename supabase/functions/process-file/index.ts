import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders, json } from "../_shared/cors.ts";

const EMBEDDING_MODEL = Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small";

function chunkText(text: string) {
  const target = 2800;
  const overlap = 400;
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [] as string[];
  if (normalized.length <= target) return [normalized];
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + target, normalized.length);
    if (end < normalized.length) {
      const breakAt = normalized.lastIndexOf("\n", end);
      if (breakAt > start + target / 2) end = breakAt;
    }
    const slice = normalized.slice(start, end).trim();
    if (slice) chunks.push(slice);
    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "No autenticado" }, 401);

  const { fileId, workspaceId } = await req.json();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!member) return json({ error: "Sin acceso" }, 403);

  const { data: file } = await supabase
    .from("files")
    .select("*")
    .eq("id", fileId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!file) return json({ error: "Archivo no encontrado" }, 404);

  const { data: blob, error: dl } = await supabase.storage
    .from("workspace-files")
    .download(file.path);
  if (dl || !blob) {
    await supabase.from("files").update({ status: "error", error_message: dl?.message }).eq("id", fileId);
    return json({ error: "No se pudo descargar" }, 500);
  }

  const mime = (file.mime_type ?? "").toLowerCase();
  let text = "";
  if (mime.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
    text = await blob.text();
  } else if (mime.startsWith("image/")) {
    text = "";
  } else {
    await supabase
      .from("files")
      .update({
        status: "error",
        error_message: "PDF: usa la ruta Next.js /api/process-file (unpdf).",
      })
      .eq("id", fileId);
    return json({ error: "Usa /api/process-file para PDF" }, 422);
  }

  await supabase.from("knowledge_chunks").delete().eq("source_type", "file").eq("source_id", fileId);

  if (!text.trim()) {
    await supabase.from("files").update({ status: "ready", error_message: null }).eq("id", fileId);
    return json({ ok: true, chunks: 0 });
  }

  const chunks = chunkText(text);
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ error: "Falta OPENAI_API_KEY" }, 500);

  const embRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: chunks }),
  });
  const embJson = await embRes.json();
  const embeddings = (embJson.data as { embedding: number[]; index: number }[])
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);

  const { error } = await supabase.from("knowledge_chunks").insert(
    chunks.map((content, index) => ({
      workspace_id: workspaceId,
      source_type: "file",
      source_id: fileId,
      content,
      embedding: embeddings[index],
      chunk_index: index,
      metadata: { title: file.name },
    })),
  );
  if (error) {
    await supabase.from("files").update({ status: "error", error_message: error.message }).eq("id", fileId);
    return json({ error: error.message }, 500);
  }

  await supabase.from("files").update({ status: "ready", error_message: null }).eq("id", fileId);
  return json({ ok: true, chunks: chunks.length });
});
