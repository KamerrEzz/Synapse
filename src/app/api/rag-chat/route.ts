import { compatibleClient } from "@/lib/ai/provider";
import { embedForWorkspace } from "@/lib/ai/embed";
import { hybridSearch } from "@/lib/ai/search";
import {
  getUserAiCred,
  jsonMissingKey,
  MissingAiKeyError,
} from "@/lib/ai/user-key";
import { requireMember } from "@/lib/server/workspace";
import { blendedChatMeta, chatMeta, embedMeta, recordUsage } from "@/lib/stats/record";
import { FREE_PLAN } from "@/lib/plans";
import type { AiSource, SearchHit } from "@/types/database";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    workspaceId?: string;
    conversationId?: string | null;
    question?: string;
  };
  if (!body.workspaceId || !body.question) {
    return Response.json({ error: "Faltan datos" }, { status: 400 });
  }

  const question = body.question;
  const workspaceId = body.workspaceId;

  const ctx = await requireMember(body.workspaceId);
  if (ctx.error || !ctx.user) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }
  const userId = ctx.user.id;

  const { data: used } = await ctx.supabase.rpc("workspace_monthly_ai_tokens", {
    p_workspace_id: body.workspaceId,
  });
  if (Number(used ?? 0) >= FREE_PLAN.aiTokensPerMonth) {
    return Response.json(
      { error: "Has alcanzado el límite de tokens del plan Free este mes." },
      { status: 402 },
    );
  }

  let cred;
  try {
    cred = await getUserAiCred(ctx.supabase);
  } catch (err) {
    if (err instanceof MissingAiKeyError) return jsonMissingKey();
    return Response.json(
      { error: err instanceof Error ? err.message : "No se pudo usar la clave" },
      { status: 400 },
    );
  }

  const { vectors, tokens: embedTokens } = await embedForWorkspace(
    ctx.supabase,
    body.workspaceId,
    [body.question],
    cred,
  );
  const [embedding] = vectors;
  let retrieved: SearchHit[] = [];
  try {
    retrieved = await hybridSearch(
      ctx.supabase,
      body.workspaceId,
      body.question,
      embedding,
      8,
    );
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "No se pudo buscar en el índice" },
      { status: 500 },
    );
  }
  const context = retrieved
    .map(
      (h, i) =>
        `[#${i + 1} ${h.source_type} ${(h.metadata as { title?: string })?.title ?? h.source_id}]\n${h.content}`,
    )
    .join("\n\n");

  const sources: AiSource[] = retrieved.map((h) => ({
    source_type: h.source_type,
    source_id: h.source_id,
    title: String((h.metadata as { title?: string })?.title ?? h.source_type),
    chunk_index: h.chunk_index,
  }));

  let conversationId = body.conversationId ?? null;
  if (!conversationId) {
    const title = body.question.slice(0, 80);
    const { data: convo, error } = await ctx.supabase
      .from("ai_conversations")
      .insert({
        workspace_id: body.workspaceId,
        user_id: userId,
        title,
      })
      .select("id")
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    conversationId = convo.id;
  }

  await ctx.supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: body.question,
  });

  const client = compatibleClient(cred.apiKey, cred.baseUrl);
  const stream = await client.chat.completions.create({
    model: cred.chatModel,
    stream: true,
    stream_options: { include_usage: true },
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Eres Synapse, la IA del workspace. Responde SOLO con el contexto proporcionado. Si la respuesta no está en el contexto, dilo claramente. Cita las fuentes con [#n] cuando uses un fragmento. Responde en el idioma de la pregunta.",
      },
      {
        role: "user",
        content: `Contexto del workspace:\n\n${context || "(sin resultados)"}\n\nPregunta: ${body.question}`,
      },
    ],
  });

  const encoder = new TextEncoder();
  let full = "";
  let promptTokens = 0;
  let completionTokens = 0;

  const readable = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      send({ conversationId, sources });
      try {
        for await (const chunk of stream) {
          if (chunk.usage) {
            promptTokens = Number(chunk.usage.prompt_tokens ?? 0);
            completionTokens = Number(chunk.usage.completion_tokens ?? 0);
          }
          const token = chunk.choices[0]?.delta?.content ?? "";
          if (token) {
            full += token;
            send({ token });
          }
        }
        await ctx.supabase.from("ai_messages").insert({
          conversation_id: conversationId,
          role: "assistant",
          content: full,
          sources,
        });
        await recordUsage(ctx.supabase, {
          workspaceId,
          userId,
          kind: "embedding_tokens",
          quantity: embedTokens,
          meta: embedMeta({
            source: "rag_chat",
            provider: cred.provider,
            model: cred.embeddingModel,
            tokens: embedTokens,
          }),
        });
        const chatTokens =
          promptTokens + completionTokens ||
          Math.ceil((question.length + full.length + context.length) / 4);
        await recordUsage(ctx.supabase, {
          workspaceId,
          userId,
          kind: "ai_tokens",
          quantity: chatTokens,
          meta:
            promptTokens || completionTokens
              ? chatMeta({
                  source: "rag_chat",
                  provider: cred.provider,
                  model: cred.chatModel,
                  promptTokens,
                  completionTokens,
                })
              : blendedChatMeta({
                  source: "rag_chat",
                  provider: cred.provider,
                  model: cred.chatModel,
                  tokens: chatTokens,
                }),
        });
        send({ done: true, conversationId });
      } catch (err) {
        send({ error: err instanceof Error ? err.message : "Error de modelo" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
