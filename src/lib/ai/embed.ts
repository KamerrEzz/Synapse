import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiCred } from "@/lib/ai/user-key";
import { compatibleClient } from "@/lib/ai/provider";
import { claimWorkspaceEmbeddingDim } from "@/lib/ai/user-key";

export type EmbedBatch = {
  vectors: number[][];
  tokens: number;
};

export async function embedTexts(texts: string[], cred: AiCred): Promise<EmbedBatch> {
  if (texts.length === 0) return { vectors: [], tokens: 0 };
  const client = compatibleClient(cred.apiKey, cred.baseUrl);
  const response = await client.embeddings.create({
    model: cred.embeddingModel,
    input: texts,
  });
  const vectors = response.data
    .sort((a, b) => a.index - b.index)
    .map((row) => row.embedding);
  const dim = vectors[0]?.length ?? 0;
  if (dim < 8) {
    throw new Error("El modelo no devolvió embeddings");
  }
  if (vectors.some((vec) => vec.length !== dim)) {
    throw new Error("Los embeddings no tienen la misma dimensión");
  }
  const tokens = Number(response.usage?.prompt_tokens ?? response.usage?.total_tokens ?? 0);
  return { vectors, tokens };
}

export async function embedForWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  texts: string[],
  cred: AiCred,
): Promise<EmbedBatch> {
  const batch = await embedTexts(texts, cred);
  if (batch.vectors[0]) {
    await claimWorkspaceEmbeddingDim(supabase, workspaceId, batch.vectors[0].length);
  }
  return batch;
}
