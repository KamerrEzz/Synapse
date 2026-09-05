import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders, json } from "../_shared/cors.ts";

const CHAT_MODEL = Deno.env.get("OPENAI_CHAT_MODEL") ?? "gpt-4.1-mini";
const EMBEDDING_MODEL = Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small";
const FREE_TOKENS = 100_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "No autenticado" }, 401);

  const { workspaceId, conversationId, question } = await req.json();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return json({ error: "No autenticado" }, 401);

  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!member) return json({ error: "Sin acceso" }, 403);

  const { data: used } = await supabase.rpc("workspace_monthly_ai_tokens", {
    p_workspace_id: workspaceId,
  });
  if (Number(used ?? 0) >= FREE_TOKENS) {
    return json({ error: "Límite de tokens del plan Free" }, 402);
  }

  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ error: "Falta OPENAI_API_KEY" }, 500);

  const embRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: question }),
  });
  const embJson = await embRes.json();
  const embedding = embJson.data?.[0]?.embedding;

  const { data: hits } = await supabase.rpc("hybrid_search", {
    p_workspace_id: workspaceId,
    p_query: question,
    p_embedding: embedding,
    p_match_count: 8,
  });

  const retrieved = (hits ?? []) as Array<{
    content: string;
    source_type: "file" | "document";
    source_id: string;
    chunk_index: number;
    metadata: { title?: string };
  }>;
  const context = retrieved
    .map((h, i) => `[#${i + 1} ${h.source_type} ${h.metadata?.title ?? h.source_id}]\n${h.content}`)
    .join("\n\n");

  let convoId = conversationId as string | null;
  if (!convoId) {
    const { data: convo, error } = await supabase
      .from("ai_conversations")
      .insert({
        workspace_id: workspaceId,
        user_id: userData.user.id,
        title: String(question).slice(0, 80),
      })
      .select("id")
      .single();
    if (error) return json({ error: error.message }, 500);
    convoId = convo.id;
  }

  await supabase.from("ai_messages").insert({
    conversation_id: convoId,
    role: "user",
    content: question,
  });

  const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Eres Synapse. Responde SOLO con el contexto. Si no está, dilo. Cita [#n].",
        },
        {
          role: "user",
          content: `Contexto:\n${context || "(vacío)"}\n\nPregunta: ${question}`,
        },
      ],
    }),
  });
  const chatJson = await chatRes.json();
  const answer = chatJson.choices?.[0]?.message?.content ?? "No pude generar una respuesta.";
  const sources = retrieved.map((h) => ({
    source_type: h.source_type,
    source_id: h.source_id,
    title: h.metadata?.title ?? h.source_type,
    chunk_index: h.chunk_index,
  }));

  await supabase.from("ai_messages").insert({
    conversation_id: convoId,
    role: "assistant",
    content: answer,
    sources,
  });

  const quantity = Math.ceil((String(question).length + answer.length + context.length) / 4);
  await supabase.from("usage_events").insert({
    workspace_id: workspaceId,
    user_id: userData.user.id,
    kind: "ai_tokens",
    quantity,
  });

  return json({ conversationId: convoId, answer, sources });
});
