import type { SupabaseClient } from "@supabase/supabase-js";
import {
  estimateBlendedChatUsd,
  estimateChatUsd,
  estimateEmbedUsd,
  type UsageKind,
  type UsageMeta,
} from "@/lib/stats/pricing";

export async function recordUsage(
  supabase: SupabaseClient,
  row: {
    workspaceId: string;
    userId: string;
    kind: UsageKind;
    quantity: number;
    meta: UsageMeta;
  },
) {
  const quantity = Math.max(0, Math.round(row.quantity));
  if (quantity === 0 && row.kind !== "file_upload") return;
  const { error } = await supabase.from("usage_events").insert({
    workspace_id: row.workspaceId,
    user_id: row.userId,
    kind: row.kind,
    quantity,
    metadata: row.meta,
  });
  if (error) console.error(error);
}

export function chatMeta(args: {
  source: UsageMeta["source"];
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}): UsageMeta {
  return {
    source: args.source,
    provider: args.provider,
    model: args.model,
    prompt_tokens: args.promptTokens,
    completion_tokens: args.completionTokens,
    estimated_usd: estimateChatUsd(args.promptTokens, args.completionTokens, args.model),
  };
}

export function embedMeta(args: {
  source: UsageMeta["source"];
  provider: string;
  model: string;
  tokens: number;
}): UsageMeta {
  return {
    source: args.source,
    provider: args.provider,
    model: args.model,
    estimated_usd: estimateEmbedUsd(args.tokens, args.model),
  };
}

export function blendedChatMeta(args: {
  source: UsageMeta["source"];
  provider: string;
  model: string;
  tokens: number;
}): UsageMeta {
  return {
    source: args.source,
    provider: args.provider,
    model: args.model,
    estimated_usd: estimateBlendedChatUsd(args.tokens, args.model),
  };
}
