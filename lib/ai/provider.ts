import OpenAI from "openai";

export function compatibleClient(apiKey: string, baseUrl: string) {
  if (!apiKey) {
    throw new Error("Falta la clave de IA");
  }
  return new OpenAI({ apiKey, baseURL: baseUrl });
}
