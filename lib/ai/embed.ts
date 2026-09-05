import { CHAT_MODEL, EMBEDDING_MODEL, requireOpenAI } from "@/lib/ai/provider";

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const openai = requireOpenAI();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((row) => row.embedding);
}

export { CHAT_MODEL, EMBEDDING_MODEL };
