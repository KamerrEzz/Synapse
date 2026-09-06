import type { AiCred } from "@/lib/ai/user-key";
import { chunkText } from "@/lib/ai/chunk";
import { embedTexts } from "@/lib/ai/embed";
import { yjsStateHexFromPlainText } from "@/lib/collab/yjs-from-plain";
import { FREE_PLAN } from "@/lib/plans";
import { embedMeta, recordUsage } from "@/lib/stats/record";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assertWorkspaceAccess,
  resolveWorkspaceRef,
  type McpSession,
} from "@/mcp/auth";

type Admin = ReturnType<typeof createAdminClient>;

type CredLoader = (workspaceId: string, userId: string) => Promise<AiCred>;

type WikiDoc = {
  id: string;
  workspace_id: string;
  title: string;
  plain_text: string;
  updated_at: string;
  created_at?: string;
};

async function loadDoc(admin: Admin, documentId: string, session: McpSession) {
  const { data, error } = await admin
    .from("documents")
    .select("id, workspace_id, title, plain_text, updated_at, created_at")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Documento no encontrado");
  await assertWorkspaceAccess(session, data.workspace_id as string);
  return data as WikiDoc;
}

async function reindexWiki(
  admin: Admin,
  session: McpSession,
  workspaceId: string,
  doc: { id: string; title: string; plain_text: string },
  credLoader: CredLoader,
) {
  await admin
    .from("knowledge_chunks")
    .delete()
    .eq("source_type", "document")
    .eq("source_id", doc.id);

  const chunks = chunkText(doc.plain_text || "");
  if (chunks.length === 0) return { chunks: 0 };

  const cred = await credLoader(workspaceId, session.userId);
  const { vectors: embeddings, tokens } = await embedTexts(chunks, cred);
  const dim = embeddings[0]?.length ?? 0;
  const { data: ws, error: wsError } = await admin
    .from("workspaces")
    .select("embedding_dim")
    .eq("id", workspaceId)
    .maybeSingle();
  if (wsError) throw new Error(wsError.message);
  const claimed = Number(ws?.embedding_dim);
  if (!claimed) {
    const { error } = await admin.from("workspaces").update({ embedding_dim: dim }).eq("id", workspaceId);
    if (error) throw new Error(error.message);
  } else if (claimed !== dim) {
    throw new Error(
      `Los embeddings de este texto tienen dimensión ${dim} y el workspace ya usa ${claimed}.`,
    );
  }

  const { error } = await admin.from("knowledge_chunks").insert(
    chunks.map((content, index) => ({
      workspace_id: workspaceId,
      source_type: "document",
      source_id: doc.id,
      content,
      embedding: embeddings[index],
      chunk_index: index,
      metadata: { title: doc.title },
    })),
  );
  if (error) throw new Error(error.message);
  await recordUsage(admin, {
    workspaceId,
    userId: session.userId,
    kind: "embedding_tokens",
    quantity: tokens,
    meta: embedMeta({
      source: "mcp_reindex",
      provider: cred.provider,
      model: cred.embeddingModel,
      tokens,
    }),
  });
  return { chunks: chunks.length };
}

function clipTitle(title: string | undefined) {
  const t = title?.trim() || "Sin título";
  return t.slice(0, 200) || "Sin título";
}

export async function mcpCreateDocument(
  session: McpSession,
  workspace: string,
  title: string | undefined,
  content: string | undefined,
  credLoader: CredLoader,
) {
  const ws = await resolveWorkspaceRef(session, workspace);
  const admin = createAdminClient();
  const { count, error: countError } = await admin
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ws.id);
  if (countError) throw new Error(countError.message);
  if ((count ?? 0) >= FREE_PLAN.maxDocuments) {
    throw new Error("Límite de documentos del plan Free");
  }

  const plain = content ?? "";
  const row = {
    workspace_id: ws.id,
    title: clipTitle(title),
    plain_text: plain,
    created_by: session.userId,
    yjs_state: yjsStateHexFromPlainText(plain),
  };
  const { data, error } = await admin.from("documents").insert(row).select("id, title, plain_text, created_at, updated_at").single();
  if (error) throw new Error(error.message);

  let indexed_chunks = 0;
  let index_error: string | undefined;
  if (plain.trim()) {
    try {
      const result = await reindexWiki(admin, session, ws.id, { ...data, title: data.title }, credLoader);
      indexed_chunks = result.chunks;
    } catch (e) {
      index_error = e instanceof Error ? e.message : "No se pudo indexar";
    }
  }

  return {
    workspace: ws.slug,
    document: data,
    indexed_chunks,
    index_error: index_error ?? null,
  };
}

export async function mcpUpdateDocument(
  session: McpSession,
  documentId: string,
  title: string | undefined,
  content: string | undefined,
  credLoader: CredLoader,
) {
  if (title === undefined && content === undefined) {
    throw new Error("Pasa title y/o content");
  }
  const admin = createAdminClient();
  const current = await loadDoc(admin, documentId, session);
  const nextTitle = title !== undefined ? clipTitle(title) : current.title;
  const nextPlain = content !== undefined ? content : current.plain_text;
  const patch: Record<string, unknown> = {
    title: nextTitle,
    plain_text: nextPlain,
  };
  if (content !== undefined) {
    patch.yjs_state = yjsStateHexFromPlainText(nextPlain);
  }
  const { data, error } = await admin
    .from("documents")
    .update(patch)
    .eq("id", documentId)
    .select("id, title, plain_text, updated_at")
    .single();
  if (error) throw new Error(error.message);

  let indexed_chunks: number | undefined;
  let index_error: string | null = null;
  if (content !== undefined) {
    try {
      const result = await reindexWiki(
        admin,
        session,
        current.workspace_id,
        { id: documentId, title: nextTitle, plain_text: nextPlain },
        credLoader,
      );
      indexed_chunks = result.chunks;
    } catch (e) {
      index_error = e instanceof Error ? e.message : "No se pudo indexar";
    }
  } else if (title !== undefined) {
    const { error: metaError } = await admin
      .from("knowledge_chunks")
      .update({ metadata: { title: nextTitle } })
      .eq("source_type", "document")
      .eq("source_id", documentId);
    if (metaError) throw new Error(metaError.message);
  }

  return {
    document: data,
    indexed_chunks: indexed_chunks ?? null,
    index_error,
  };
}

export async function mcpDeleteDocument(session: McpSession, documentId: string) {
  const admin = createAdminClient();
  const current = await loadDoc(admin, documentId, session);
  const { error: chunksError } = await admin
    .from("knowledge_chunks")
    .delete()
    .eq("source_type", "document")
    .eq("source_id", documentId);
  if (chunksError) throw new Error(chunksError.message);
  const { error } = await admin.from("documents").delete().eq("id", documentId);
  if (error) throw new Error(error.message);
  return { ok: true, id: documentId, title: current.title };
}
