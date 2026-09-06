import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiCred } from "@/lib/ai/user-key";
import { compatibleClient } from "@/lib/ai/provider";
import { claimWorkspaceEmbeddingDim } from "@/lib/ai/user-key";

export async function embedTexts(texts: string[], cred: AiCred): Promise<number[][]> {
  if (texts.length === 0) return [];
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
  return vectors;
}

export async function embedForWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  texts: string[],
  cred: AiCred,
) {
  const vectors = await embedTexts(texts, cred);
  await claimWorkspaceEmbeddingDim(supabase, workspaceId, vectors[0].length);
  return vectors;
}
