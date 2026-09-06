import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_PRESETS, isAiProviderId, type AiProviderId } from "@/lib/ai/catalog";
import { compatibleClient } from "@/lib/ai/provider";
import { decryptSecret } from "@/lib/crypto/secret";

export type AiCred = {
  apiKey: string;
  provider: AiProviderId;
  baseUrl: string;
  chatModel: string;
  embeddingModel: string;
  embeddingDim: number;
};

export type AiCredMeta = {
  configured: boolean;
  last4: string | null;
  updatedAt: string | null;
  provider: AiProviderId;
  baseUrl: string;
  chatModel: string;
  embeddingModel: string;
  embeddingDim: number;
};

type MetaRow = {
  last4?: string;
  updated_at?: string;
  provider?: string;
  base_url?: string | null;
  chat_model?: string | null;
  embedding_model?: string | null;
  embedding_dim?: number | null;
};

export class MissingAiKeyError extends Error {
  readonly code = "missing_ai_key" as const;
  constructor() {
    super("Añade tu clave de IA en Ajustes para usar esta función.");
    this.name = "MissingAiKeyError";
  }
}

/** @deprecated alias */
export const MissingOpenAIKeyError = MissingAiKeyError;

function defaultsFrom(provider: AiProviderId): Omit<AiCredMeta, "configured" | "last4" | "updatedAt"> {
  const preset = AI_PRESETS[provider];
  return {
    provider,
    baseUrl: preset.baseUrl,
    chatModel: preset.chatModel,
    embeddingModel: preset.embeddingModel,
    embeddingDim: preset.embeddingDim,
  };
}

export async function getUserAiCred(supabase: SupabaseClient): Promise<AiCred> {
  const [{ data: cipher, error: cipherError }, meta] = await Promise.all([
    supabase.rpc("own_openai_key_cipher"),
    getUserOpenAIMeta(supabase),
  ]);
  if (cipherError) throw new Error(cipherError.message);
  if (!cipher || typeof cipher !== "string" || !meta.configured) {
    throw new MissingAiKeyError();
  }
  return {
    apiKey: decryptSecret(cipher),
    provider: meta.provider,
    baseUrl: meta.baseUrl,
    chatModel: meta.chatModel,
    embeddingModel: meta.embeddingModel,
    embeddingDim: meta.embeddingDim,
  };
}

export async function openaiForUser(supabase: SupabaseClient) {
  const cred = await getUserAiCred(supabase);
  return compatibleClient(cred.apiKey, cred.baseUrl);
}

export async function getUserOpenAIMeta(supabase: SupabaseClient): Promise<AiCredMeta> {
  const fallback = { configured: false as const, last4: null, updatedAt: null, ...defaultsFrom("openai") };
  const { data, error } = await supabase.rpc("own_openai_key_meta").maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as MetaRow | null;
  if (!row?.last4) return fallback;
  const raw = row.provider ?? "openai";
  const provider = isAiProviderId(raw) ? raw : "openai";
  const preset = AI_PRESETS[provider];
  return {
    configured: true,
    last4: row.last4,
    updatedAt: row.updated_at ?? null,
    provider,
    baseUrl: row.base_url || preset.baseUrl,
    chatModel: row.chat_model || preset.chatModel,
    embeddingModel: row.embedding_model || preset.embeddingModel,
    embeddingDim: row.embedding_dim || preset.embeddingDim,
  };
}

export async function claimWorkspaceEmbeddingDim(
  supabase: SupabaseClient,
  workspaceId: string,
  dim: number,
) {
  const { error } = await supabase.rpc("claim_workspace_embedding_dim", {
    p_workspace_id: workspaceId,
    p_dim: dim,
  });
  if (error) throw new Error(error.message);
}

export function jsonMissingKey() {
  return Response.json(
    { error: new MissingAiKeyError().message, code: "missing_ai_key" },
    { status: 409 },
  );
}
