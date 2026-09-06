import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_PRESETS, isAiProviderId, type AiProviderId } from "@/lib/ai/catalog";
import { compatibleClient } from "@/lib/ai/provider";
import { decryptSecret } from "@/lib/crypto/secret";
import { createAdminClient } from "@/lib/supabase/admin";

export type AiKeyMode = "personal" | "shared";

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

export type WorkspaceAiAccess = {
  mode: AiKeyMode;
  configured: boolean;
  personal: AiCredMeta;
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

type KeyRow = {
  ciphertext: string;
  provider?: string | null;
  base_url?: string | null;
  chat_model?: string | null;
  embedding_model?: string | null;
  embedding_dim?: number | null;
};

export class MissingAiKeyError extends Error {
  readonly code = "missing_ai_key" as const;
  constructor(message = "Añade tu clave de IA en Ajustes para usar esta función.") {
    super(message);
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

function parseAiKeyMode(value: unknown): AiKeyMode {
  return value === "shared" ? "shared" : "personal";
}

function credFromRow(data: KeyRow): AiCred {
  const raw = String(data.provider ?? "openai");
  const provider = isAiProviderId(raw) ? raw : "openai";
  const preset = AI_PRESETS[provider];
  return {
    apiKey: decryptSecret(data.ciphertext),
    provider,
    baseUrl: data.base_url || preset.baseUrl,
    chatModel: data.chat_model || preset.chatModel,
    embeddingModel: data.embedding_model || preset.embeddingModel,
    embeddingDim: Number(data.embedding_dim) || preset.embeddingDim,
  };
}

export async function loadAiCredForUserId(userId: string): Promise<AiCred | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_openai_keys")
    .select("ciphertext, provider, base_url, chat_model, embedding_model, embedding_dim")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.ciphertext) return null;
  return credFromRow(data as KeyRow);
}

async function workspaceOwnerId(workspaceId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.user_id as string | undefined) ?? null;
}

async function readAiKeyMode(supabase: SupabaseClient, workspaceId: string): Promise<AiKeyMode> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("ai_key_mode")
    .eq("id", workspaceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return parseAiKeyMode(data?.ai_key_mode);
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

export async function resolveWorkspaceAiCred(opts: {
  supabase: SupabaseClient;
  workspaceId: string;
  actingUserId?: string;
}): Promise<AiCred> {
  const mode = await readAiKeyMode(opts.supabase, opts.workspaceId);
  if (mode === "shared") {
    const ownerId = await workspaceOwnerId(opts.workspaceId);
    if (!ownerId) {
      throw new MissingAiKeyError("Este workspace no tiene un propietario con clave de IA.");
    }
    const cred = await loadAiCredForUserId(ownerId);
    if (!cred) {
      throw new MissingAiKeyError(
        "El propietario comparte la clave del workspace, pero aún no hay ninguna configurada.",
      );
    }
    return cred;
  }
  if (opts.actingUserId) {
    const cred = await loadAiCredForUserId(opts.actingUserId);
    if (!cred) throw new MissingAiKeyError();
    return cred;
  }
  return getUserAiCred(opts.supabase);
}

export async function getWorkspaceAiCred(supabase: SupabaseClient, workspaceId: string) {
  return resolveWorkspaceAiCred({ supabase, workspaceId });
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

export async function getWorkspaceAiAccess(
  supabase: SupabaseClient,
  workspace: { id: string; ai_key_mode?: string | null },
): Promise<WorkspaceAiAccess> {
  const mode = parseAiKeyMode(workspace.ai_key_mode);
  const personal = await getUserOpenAIMeta(supabase);
  if (mode === "personal") {
    return { mode, configured: personal.configured, personal };
  }
  const ownerId = await workspaceOwnerId(workspace.id);
  if (!ownerId) return { mode, configured: false, personal };
  const cred = await loadAiCredForUserId(ownerId);
  return { mode, configured: Boolean(cred), personal };
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

export function jsonMissingKey(err?: unknown) {
  const message = err instanceof MissingAiKeyError ? err.message : new MissingAiKeyError().message;
  return Response.json({ error: message, code: "missing_ai_key" }, { status: 409 });
}
