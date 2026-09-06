import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_PRESETS, isAiProviderId } from "@/lib/ai/catalog";
import { resolveWorkspaceAiCred, MissingAiKeyError } from "@/lib/ai/user-key";
import { FREE_PLAN } from "@/lib/plans";
import {
  chatRate,
  embedRate,
  estimateBlendedChatUsd,
  estimateChatUsd,
  estimateEmbedUsd,
  pricingExact,
} from "@/lib/stats/pricing";
import type { StatRangeDays, StatsSnapshot, DayPoint } from "@/lib/stats/types";

type IndexTotals = {
  chunks?: number;
  chars?: number;
  avg_chars?: number;
  file_chunks?: number;
  document_chunks?: number;
  file_sources?: number;
  document_sources?: number;
  indexed_document_ids?: string[];
  top_sources?: { source_type: string; source_id: string; chunks: number; chars: number }[];
};

function n(value: unknown) {
  const x = Number(value ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function eachDay(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function emptyPoint(day: string): DayPoint {
  return {
    day,
    tokens: 0,
    embeddingTokens: 0,
    usd: 0,
    messages: 0,
    files: 0,
    documents: 0,
    aiTurns: 0,
  };
}

export function parseRangeDays(raw: string | undefined): StatRangeDays {
  const value = Number(raw);
  if (value === 7 || value === 90) return value;
  return 30;
}

export type CollectStatsOptions = {
  /** Token owner when collecting with service_role (MCP). */
  actingUserId?: string;
};

export async function collectWorkspaceStats(
  supabase: SupabaseClient,
  workspace: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    created_at: string;
    embedding_dim?: number | null;
  },
  days: StatRangeDays,
  opts?: CollectStatsOptions,
): Promise<StatsSnapshot> {
  const now = new Date();
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const eventsFrom = from < monthStart ? from : monthStart;
  const fromIso = from.toISOString();
  const eventsFromIso = eventsFrom.toISOString();

  const [
    docsRes,
    filesRes,
    membersRes,
    channelsRes,
    messagesCountRes,
    messagesRes,
    convosRes,
    eventsRes,
    indexRes,
    mcpRes,
    wsRes,
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title, plain_text, created_by, created_at, updated_at")
      .eq("workspace_id", workspace.id),
    supabase
      .from("files")
      .select("id, name, mime_type, status, size, created_at, error_message")
      .eq("workspace_id", workspace.id),
    supabase
      .from("workspace_members")
      .select("user_id, role, joined_at, profiles(full_name)")
      .eq("workspace_id", workspace.id),
    supabase.from("channels").select("id").eq("workspace_id", workspace.id),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id),
    supabase
      .from("messages")
      .select("id, user_id, created_at")
      .eq("workspace_id", workspace.id)
      .gte("created_at", fromIso)
      .limit(8000),
    supabase
      .from("ai_conversations")
      .select("id, user_id, created_at")
      .eq("workspace_id", workspace.id),
    supabase
      .from("usage_events")
      .select("id, user_id, kind, quantity, created_at, metadata")
      .eq("workspace_id", workspace.id)
      .gte("created_at", eventsFromIso)
      .order("created_at", { ascending: true })
      .limit(8000),
    supabase.rpc("workspace_index_totals", {
      p_workspace_id: workspace.id,
      ...(opts?.actingUserId ? { p_user_id: opts.actingUserId } : {}),
    }),
    supabase.rpc("workspace_mcp_token_stats", {
      p_workspace_id: workspace.id,
      ...(opts?.actingUserId ? { p_user_id: opts.actingUserId } : {}),
    }),
    supabase.from("workspaces").select("embedding_dim").eq("id", workspace.id).maybeSingle(),
  ]);

  if (docsRes.error) throw new Error(docsRes.error.message);
  if (filesRes.error) throw new Error(filesRes.error.message);
  if (membersRes.error) throw new Error(membersRes.error.message);
  if (channelsRes.error) throw new Error(channelsRes.error.message);
  if (messagesRes.error) throw new Error(messagesRes.error.message);
  if (convosRes.error) throw new Error(convosRes.error.message);
  if (eventsRes.error) throw new Error(eventsRes.error.message);
  if (indexRes.error) throw new Error(indexRes.error.message);
  if (mcpRes.error) throw new Error(mcpRes.error.message);

  const index = (indexRes.data ?? {}) as IndexTotals;
  const mcp = (mcpRes.data ?? {}) as { active?: number; used?: number; last_used_at?: string | null };
  const embeddingDim = Number(wsRes.data?.embedding_dim ?? workspace.embedding_dim) || null;

  const docs = docsRes.data ?? [];
  const files = filesRes.data ?? [];
  const members = membersRes.data ?? [];
  const convos = convosRes.data ?? [];
  const events = eventsRes.data ?? [];
  const messages = messagesRes.data ?? [];

  const nameByUser = new Map<string, string>();
  for (const row of members) {
    const profile = row.profiles as unknown as { full_name?: string | null } | null;
    nameByUser.set(row.user_id as string, profile?.full_name || "Sin nombre");
  }

  const convoIds = convos.map((c) => c.id as string);
  let aiMessages: { id: string; conversation_id: string; role: string; content: string; created_at: string }[] = [];
  if (convoIds.length) {
    const { data, error } = await supabase
      .from("ai_messages")
      .select("id, conversation_id, role, content, created_at")
      .in("conversation_id", convoIds)
      .limit(8000);
    if (error) throw new Error(error.message);
    aiMessages = (data ?? []) as typeof aiMessages;
  }

  let cred: { provider: string; chatModel: string; embeddingModel: string } | null = null;
  try {
    const c = await resolveWorkspaceAiCred({
      supabase,
      workspaceId: workspace.id,
      actingUserId: opts?.actingUserId,
    });
    cred = { provider: c.provider, chatModel: c.chatModel, embeddingModel: c.embeddingModel };
  } catch (err) {
    if (!(err instanceof MissingAiKeyError)) throw err;
    cred = {
      provider: "openai",
      chatModel: AI_PRESETS.openai.chatModel,
      embeddingModel: AI_PRESETS.openai.embeddingModel,
    };
  }

  const chatModel = cred.chatModel;
  const embedModel = cred.embeddingModel;
  const provider = isAiProviderId(cred.provider) ? cred.provider : "openai";

  function eventUsd(kind: string, quantity: number, meta: Record<string, unknown>) {
    if (typeof meta.estimated_usd === "number") return meta.estimated_usd;
    const model = String(meta.model || (kind === "embedding_tokens" ? embedModel : chatModel));
    if (kind === "embedding_tokens") return estimateEmbedUsd(quantity, model);
    if (kind === "ai_tokens") {
      const prompt = n(meta.prompt_tokens);
      const completion = n(meta.completion_tokens);
      if (prompt || completion) return estimateChatUsd(prompt, completion, model);
      return estimateBlendedChatUsd(quantity, model);
    }
    return 0;
  }

  const indexedDocIds = new Set(
    (index.indexed_document_ids ?? []).length
      ? index.indexed_document_ids
      : (index.top_sources ?? [])
          .filter((s) => s.source_type === "document")
          .map((s) => s.source_id),
  );
  const titleBySource = new Map<string, string>();
  for (const d of docs) titleBySource.set(`document:${d.id}`, d.title || "Sin título");
  for (const f of files) titleBySource.set(`file:${f.id}`, f.name);

  const docsMapped = docs.map((d) => {
    const chars = (d.plain_text as string | null)?.length ?? 0;
    return {
      id: d.id as string,
      title: (d.title as string) || "Sin título",
      chars,
      indexed: indexedDocIds.has(d.id as string),
      updatedAt: d.updated_at as string,
      createdBy: (d.created_by as string | null) ?? null,
    };
  });

  const filesMapped = files.map((f) => ({
    id: f.id as string,
    name: f.name as string,
    mime: (f.mime_type as string | null) ?? null,
    status: f.status as string,
    size: n(f.size),
    createdAt: f.created_at as string,
    error: (f.error_message as string | null) ?? null,
  }));

  const monthEvents = events.filter((e) => new Date(e.created_at as string) >= monthStart);
  const rangeEvents = events.filter((e) => new Date(e.created_at as string) >= from);

  const aiTokensMonth = monthEvents
    .filter((e) => e.kind === "ai_tokens")
    .reduce((sum, e) => sum + n(e.quantity), 0);
  const usdMonth = monthEvents.reduce(
    (sum, e) => sum + eventUsd(e.kind as string, n(e.quantity), (e.metadata ?? {}) as Record<string, unknown>),
    0,
  );

  const tokensInRange = rangeEvents
    .filter((e) => e.kind === "ai_tokens")
    .reduce((sum, e) => sum + n(e.quantity), 0);
  const embeddingTokensInRange = rangeEvents
    .filter((e) => e.kind === "embedding_tokens")
    .reduce((sum, e) => sum + n(e.quantity), 0);
  const usdInRange = rangeEvents.reduce(
    (sum, e) => sum + eventUsd(e.kind as string, n(e.quantity), (e.metadata ?? {}) as Record<string, unknown>),
    0,
  );

  const byKindMap = new Map<string, { value: number; usd: number }>();
  const bySourceMap = new Map<string, { value: number; usd: number }>();
  const byModelMap = new Map<string, { value: number; usd: number }>();
  const byUserMap = new Map<string, { tokens: number; usd: number }>();
  let promptTokensInRange = 0;
  let completionTokensInRange = 0;
  let eventsWithUsageSplit = 0;
  for (const e of rangeEvents) {
    const qty = n(e.quantity);
    const meta = (e.metadata ?? {}) as Record<string, unknown>;
    const usd = eventUsd(e.kind as string, qty, meta);
    const kind = e.kind as string;
    const kindPrev = byKindMap.get(kind) ?? { value: 0, usd: 0 };
    kindPrev.value += qty;
    kindPrev.usd += usd;
    byKindMap.set(kind, kindPrev);
    const source = String(meta.source || "sin_origen");
    const srcPrev = bySourceMap.get(source) ?? { value: 0, usd: 0 };
    srcPrev.value += qty;
    srcPrev.usd += usd;
    bySourceMap.set(source, srcPrev);
    const model = String(meta.model || (kind === "embedding_tokens" ? embedModel : chatModel));
    const modelPrev = byModelMap.get(model) ?? { value: 0, usd: 0 };
    modelPrev.value += qty;
    modelPrev.usd += usd;
    byModelMap.set(model, modelPrev);
    const uid = (e.user_id as string | null) || "desconocido";
    const prev = byUserMap.get(uid) ?? { tokens: 0, usd: 0 };
    prev.tokens += qty;
    prev.usd += usd;
    byUserMap.set(uid, prev);
    if (kind === "ai_tokens") {
      const prompt = n(meta.prompt_tokens);
      const completion = n(meta.completion_tokens);
      if (prompt || completion) {
        promptTokensInRange += prompt;
        completionTokensInRange += completion;
        eventsWithUsageSplit += 1;
      }
    }
  }

  const labelKind: Record<string, string> = {
    ai_tokens: "Chat / RAG",
    embedding_tokens: "Embeddings",
    file_upload: "Subida",
  };
  const labelSource: Record<string, string> = {
    rag_chat: "Chat IA",
    mcp_ask: "MCP ask",
    embed_file: "Indexar archivo",
    embed_document: "Indexar wiki",
    embed_search: "Búsqueda",
    mcp_reindex: "MCP reindex",
    file_upload: "Subida",
    sin_origen: "Sin metadatos (histórico)",
  };

  const seriesMap = new Map(eachDay(from, now).map((d) => [d, emptyPoint(d)]));
  for (const e of rangeEvents) {
    const point = seriesMap.get(dayKey(e.created_at as string));
    if (!point) continue;
    const qty = n(e.quantity);
    const meta = (e.metadata ?? {}) as Record<string, unknown>;
    if (e.kind === "ai_tokens") point.tokens += qty;
    if (e.kind === "embedding_tokens") point.embeddingTokens += qty;
    point.usd += eventUsd(e.kind as string, qty, meta);
  }
  for (const m of messages) {
    const point = seriesMap.get(dayKey(m.created_at as string));
    if (point) point.messages += 1;
  }
  for (const f of filesMapped) {
    const point = seriesMap.get(dayKey(f.createdAt));
    if (point) point.files += 1;
  }
  for (const d of docsMapped) {
    const created = docs.find((row) => row.id === d.id)?.created_at as string | undefined;
    if (!created) continue;
    const point = seriesMap.get(dayKey(created));
    if (point) point.documents += 1;
  }
  for (const m of aiMessages) {
    if (m.role !== "assistant") continue;
    if (new Date(m.created_at) < from) continue;
    const point = seriesMap.get(dayKey(m.created_at));
    if (point) point.aiTurns += 1;
  }

  const assistant = aiMessages.filter((m) => m.role === "assistant");
  const repliesInRange = assistant.filter((m) => new Date(m.created_at) >= from).length;
  const chatUsdInRange = byKindMap.get("ai_tokens")?.usd ?? 0;
  const docsEmpty = docsMapped.filter((d) => d.chars === 0).length;
  const docsIndexed = docsMapped.filter((d) => d.indexed).length;
  const docsWithText = docsMapped.filter((d) => d.chars > 0).length;

  const chatExact = pricingExact(chatModel, "chat") && provider === "openai";
  const embedExact = pricingExact(embedModel, "embed") && (provider === "openai" || embedModel in { "qwen3-embedding": 1 });
  const caveat = chatExact
    ? "Coste estimado con la lista pública de OpenAI (ago 2026). BYOK: lo cobra tu proveedor, no Synapse. Eventos viejos sin metadatos usan 70/30 entrada/salida."
    : "Tu modelo no está en la lista OpenAI: el coste usa una tarifa de referencia (gpt-4.1-mini / embedding-3-small). BYOK: lo cobra tu proveedor.";

  const rate = chatRate(chatModel);

  return {
    generatedAt: now.toISOString(),
    days,
    from: fromIso,
    to: now.toISOString(),
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      plan: workspace.plan,
      createdAt: workspace.created_at,
      embeddingDim,
    },
    plan: {
      aiTokensMonth,
      aiTokensCap: FREE_PLAN.aiTokensPerMonth,
      files: files.length,
      filesCap: FREE_PLAN.maxFiles,
      documents: docs.length,
      documentsCap: FREE_PLAN.maxDocuments,
      members: members.length,
      membersCap: FREE_PLAN.maxMembers,
    },
    knowledge: {
      chunks: n(index.chunks),
      chars: n(index.chars),
      avgChars: n(index.avg_chars),
      fileChunks: n(index.file_chunks),
      documentChunks: n(index.document_chunks),
      fileSources: n(index.file_sources),
      documentSources: n(index.document_sources),
      docsTotal: docs.length,
      docsEmpty,
      docsIndexed,
      docsUnindexed: Math.max(0, docsWithText - docsIndexed),
      filesReady: filesMapped.filter((f) => f.status === "ready").length,
      filesError: filesMapped.filter((f) => f.status === "error").length,
      filesProcessing: filesMapped.filter((f) => f.status === "processing").length,
      filesImages: filesMapped.filter((f) => f.mime?.startsWith("image/")).length,
      filesBytes: filesMapped.reduce((sum, f) => sum + f.size, 0),
      staleDocs: docsMapped.filter((d) => d.chars > 0 && !d.indexed).length,
    },
    collab: {
      channels: (channelsRes.data ?? []).length,
      messagesTotal: messagesCountRes.count ?? messages.length,
      messagesInRange: messages.length,
      uniqueAuthors: new Set(messages.map((m) => m.user_id).filter(Boolean)).size,
      aiConversations: convos.length,
      aiMessages: aiMessages.length,
      assistantReplies: assistant.length,
      avgReplyChars:
        assistant.length === 0
          ? 0
          : assistant.reduce((sum, m) => sum + m.content.length, 0) / assistant.length,
    },
    ai: {
      tokensInRange,
      embeddingTokensInRange,
      promptTokensInRange,
      completionTokensInRange,
      eventsWithUsageSplit,
      usdInRange,
      usdMonth,
      usdPerAssistantReply: repliesInRange === 0 ? 0 : chatUsdInRange / repliesInRange,
      eventsInRange: rangeEvents.length,
      byKind: [...byKindMap.entries()]
        .map(([key, v]) => ({
          key,
          label: labelKind[key] ?? key,
          value: v.value,
          usd: v.usd,
        }))
        .sort((a, b) => b.value - a.value),
      bySource: [...bySourceMap.entries()]
        .map(([key, v]) => ({
          key,
          label: labelSource[key] ?? key,
          value: v.value,
          usd: v.usd,
        }))
        .sort((a, b) => b.value - a.value),
      usdBySource: [...bySourceMap.entries()]
        .map(([key, v]) => ({
          key,
          label: labelSource[key] ?? key,
          value: Number(v.usd.toFixed(6)),
          usd: v.usd,
        }))
        .sort((a, b) => (b.usd ?? 0) - (a.usd ?? 0)),
      byUser: [...byUserMap.entries()]
        .map(([userId, v]) => ({
          userId,
          name: nameByUser.get(userId) || userId.slice(0, 8),
          tokens: v.tokens,
          usd: v.usd,
        }))
        .sort((a, b) => b.usd - a.usd),
      byModel: [...byModelMap.entries()]
        .map(([key, v]) => ({
          key,
          label: key,
          value: v.value,
          usd: v.usd,
        }))
        .sort((a, b) => b.value - a.value),
      pricing: {
        provider,
        chatModel,
        embeddingModel: embedModel,
        chatInputPerM: rate.input,
        chatOutputPerM: rate.output,
        embedPerM: embedRate(embedModel),
        chatExact,
        embedExact,
      },
      caveat,
    },
    mcp: {
      active: n(mcp.active),
      used: n(mcp.used),
      lastUsedAt: mcp.last_used_at ?? null,
    },
    series: [...seriesMap.values()],
    topSources: (index.top_sources ?? []).map((s) => ({
      sourceType: s.source_type,
      sourceId: s.source_id,
      title: titleBySource.get(`${s.source_type}:${s.source_id}`) ?? s.source_id.slice(0, 8),
      chunks: n(s.chunks),
      chars: n(s.chars),
    })),
    files: filesMapped,
    documents: docsMapped,
    events: rangeEvents.map((e) => {
      const meta = (e.metadata ?? {}) as Record<string, unknown>;
      return {
        id: e.id as string,
        createdAt: e.created_at as string,
        kind: e.kind as string,
        quantity: n(e.quantity),
        usd: eventUsd(e.kind as string, n(e.quantity), meta),
        source: String(meta.source || "sin_origen"),
        model: String(meta.model || ""),
        userId: (e.user_id as string | null) ?? null,
        promptTokens: n(meta.prompt_tokens),
        completionTokens: n(meta.completion_tokens),
      };
    }),
  };
}

export function compactStatsForAgent(snap: StatsSnapshot) {
  return {
    generatedAt: snap.generatedAt,
    days: snap.days,
    from: snap.from,
    to: snap.to,
    workspace: snap.workspace,
    plan: snap.plan,
    knowledge: snap.knowledge,
    collab: snap.collab,
    mcp: snap.mcp,
    ai: {
      tokensInRange: snap.ai.tokensInRange,
      embeddingTokensInRange: snap.ai.embeddingTokensInRange,
      promptTokensInRange: snap.ai.promptTokensInRange,
      completionTokensInRange: snap.ai.completionTokensInRange,
      eventsWithUsageSplit: snap.ai.eventsWithUsageSplit,
      usdInRange: snap.ai.usdInRange,
      usdMonth: snap.ai.usdMonth,
      usdPerAssistantReply: snap.ai.usdPerAssistantReply,
      eventsInRange: snap.ai.eventsInRange,
      byKind: snap.ai.byKind,
      bySource: snap.ai.bySource,
      usdBySource: snap.ai.usdBySource,
      byUser: snap.ai.byUser,
      byModel: snap.ai.byModel,
      pricing: snap.ai.pricing,
      caveat: snap.ai.caveat,
    },
    series: snap.series,
    topSources: snap.topSources,
    files_error: snap.files.filter((f) => f.status === "error"),
    wiki_unindexed: snap.documents.filter((d) => d.chars > 0 && !d.indexed),
  };
}
