export type AiProviderId = "openai" | "nan" | "compatible";

export type AiPreset = {
  id: AiProviderId;
  label: string;
  baseUrl: string;
  chatModel: string;
  embeddingModel: string;
  embeddingDim: number;
  hint: string;
};

export const AI_PRESETS: Record<AiProviderId, AiPreset> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    chatModel: "gpt-4.1-mini",
    embeddingModel: "text-embedding-3-small",
    embeddingDim: 1536,
    hint: "api.openai.com",
  },
  nan: {
    id: "nan",
    label: "NaN",
    baseUrl: "https://api.nan.builders/v1",
    chatModel: "qwen3.6",
    embeddingModel: "qwen3-embedding",
    embeddingDim: 1024,
    hint: "Cluster EU, compatible con OpenAI. La dimensión la marca el modelo al indexar (NaN suele devolver 1024).",
  },
  compatible: {
    id: "compatible",
    label: "Compatible (URL propia)",
    baseUrl: "",
    chatModel: "",
    embeddingModel: "",
    embeddingDim: 1536,
    hint: "Cualquier endpoint /v1 con el contrato de OpenAI (Ollama, vLLM, Helmcode, etc.).",
  },
};

export const AI_PROVIDER_IDS = Object.keys(AI_PRESETS) as AiProviderId[];

export function isAiProviderId(value: string): value is AiProviderId {
  return value in AI_PRESETS;
}
