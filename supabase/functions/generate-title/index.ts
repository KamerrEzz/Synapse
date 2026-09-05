import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders, json } from "../_shared/cors.ts";

const MODEL = Deno.env.get("OPENAI_CHAT_MODEL") ?? "gpt-4.1-mini";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "No autenticado" }, 401);

  const { conversationId, workspaceId } = await req.json();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!member) return json({ error: "Sin acceso" }, 403);

  const { data: messages } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at")
    .limit(4);

  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ error: "Falta OPENAI_API_KEY" }, 500);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "Genera un título corto (máx 8 palabras) para esta conversación. Sin comillas.",
        },
        { role: "user", content: JSON.stringify(messages ?? []) },
      ],
    }),
  });
  const jsonBody = await res.json();
  const title = jsonBody.choices?.[0]?.message?.content?.trim() ?? "Conversación";

  await supabase
    .from("ai_conversations")
    .update({ title })
    .eq("id", conversationId);

  return json({ title });
});
