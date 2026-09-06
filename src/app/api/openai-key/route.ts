import { createClient } from "@/lib/supabase/server";
import { AI_PRESETS, isAiProviderId } from "@/lib/ai/catalog";
import { getUserOpenAIMeta } from "@/lib/ai/user-key";
import {
  assertApiKeyFormat,
  assertHttpsApiUrl,
  encryptSecret,
  last4OfKey,
} from "@/lib/crypto/secret";

async function requireSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: Response.json({ error: "No autenticado" }, { status: 401 }) };
  }
  return { supabase, user };
}

export async function GET() {
  const ctx = await requireSession();
  if (!("supabase" in ctx)) return ctx.error;
  try {
    const meta = await getUserOpenAIMeta(ctx.supabase);
    return Response.json(meta);
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo leer la clave";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const ctx = await requireSession();
  if (!("supabase" in ctx)) return ctx.error;
  const body = (await request.json()) as {
    key?: string;
    provider?: string;
    baseUrl?: string;
    chatModel?: string;
    embeddingModel?: string;
    embeddingDim?: number;
  };

  const rawProvider = body.provider ?? "openai";
  const provider = isAiProviderId(rawProvider) ? rawProvider : "openai";
  const preset = AI_PRESETS[provider];
  const locked = provider !== "compatible";

  try {
    const baseUrl = assertHttpsApiUrl(locked ? preset.baseUrl : (body.baseUrl || preset.baseUrl));
    const chatModel = (locked ? preset.chatModel : body.chatModel?.trim() || preset.chatModel).slice(0, 80);
    const embeddingModel = (
      locked ? preset.embeddingModel : body.embeddingModel?.trim() || preset.embeddingModel
    ).slice(0, 80);
    const embeddingDim = locked
      ? preset.embeddingDim
      : Number(body.embeddingDim) || preset.embeddingDim;
    if (embeddingDim < 8 || embeddingDim > 16000) {
      throw new Error("Dimensión de embeddings inválida");
    }

    const key = body.key?.trim() ?? "";
    let ciphertext: string | null = null;
    let last4: string | null = null;
    if (key) {
      assertApiKeyFormat(key);
      ciphertext = encryptSecret(key);
      last4 = last4OfKey(key);
    }

    const { error } = await ctx.supabase.rpc("save_own_ai_credential", {
      p_provider: provider,
      p_base_url: baseUrl,
      p_chat_model: chatModel,
      p_embedding_model: embeddingModel,
      p_embedding_dim: embeddingDim,
      p_ciphertext: ciphertext,
      p_last4: last4,
    });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    const meta = await getUserOpenAIMeta(ctx.supabase);
    return Response.json(meta);
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo guardar";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  const ctx = await requireSession();
  if (!("supabase" in ctx)) return ctx.error;
  const { error } = await ctx.supabase.rpc("delete_own_openai_key");
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ configured: false });
}
