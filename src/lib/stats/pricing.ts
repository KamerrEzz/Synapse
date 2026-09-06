export type UsageKind = "ai_tokens" | "embedding_tokens" | "file_upload";

export type UsageSource =
  | "rag_chat"
  | "mcp_ask"
  | "embed_file"
  | "embed_document"
  | "embed_search"
  | "mcp_reindex"
  | "file_upload";

export type UsageMeta = {
  source: UsageSource;
  provider?: string;
  model?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  estimated_usd?: number;
};

/** USD per 1M tokens. OpenAI list as of 2026-08. Other providers fall back with a flag. */
type Rate = { input: number; output: number };

const CHAT_RATES: Record<string, Rate> = {
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-5-mini": { input: 0.25, output: 2 },
  "gpt-5-nano": { input: 0.05, output: 0.4 },
  "o4-mini": { input: 1.1, output: 4.4 },
  "o3-mini": { input: 1.1, output: 4.4 },
};

const EMBED_RATES: Record<string, number> = {
  "text-embedding-3-small": 0.02,
  "text-embedding-3-large": 0.13,
  "text-embedding-ada-002": 0.1,
  "qwen3-embedding": 0.02,
};

const FALLBACK_CHAT: Rate = { input: 0.4, output: 1.6 };
const FALLBACK_EMBED = 0.02;

function norm(model: string) {
  return model.trim().toLowerCase();
}

export function chatRate(model: string): Rate {
  const key = norm(model);
  return CHAT_RATES[key] ?? CHAT_RATES[key.replace(/-\d{4}-\d{2}-\d{2}$/, "")] ?? FALLBACK_CHAT;
}

export function embedRate(model: string): number {
  const key = norm(model);
  return EMBED_RATES[key] ?? FALLBACK_EMBED;
}

export function estimateChatUsd(promptTokens: number, completionTokens: number, model: string) {
  const rate = chatRate(model);
  return (promptTokens / 1_000_000) * rate.input + (completionTokens / 1_000_000) * rate.output;
}

export function estimateEmbedUsd(tokens: number, model: string) {
  return (tokens / 1_000_000) * embedRate(model);
}

/** Approx events store a single quantity. Treat as 70% input / 30% output. */
export function estimateBlendedChatUsd(tokens: number, model: string) {
  return estimateChatUsd(tokens * 0.7, tokens * 0.3, model);
}

export function pricingExact(model: string, kind: "chat" | "embed") {
  const key = norm(model);
  if (kind === "embed") return key in EMBED_RATES;
  return key in CHAT_RATES || key.replace(/-\d{4}-\d{2}-\d{2}$/, "") in CHAT_RATES;
}
