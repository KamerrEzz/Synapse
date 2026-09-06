import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedTexts } from "@/lib/ai/embed";
import { hybridSearchAsUser } from "@/lib/ai/search";
import { compatibleClient } from "@/lib/ai/provider";
import { decryptSecret } from "@/lib/crypto/secret";
import { AI_PRESETS, isAiProviderId } from "@/lib/ai/catalog";
import { FREE_PLAN } from "@/lib/plans";
import type { AiCred } from "@/lib/ai/user-key";
import type { AuthInfo } from "@modelcontextprotocol/server";
import {
  assertWorkspaceAccess,
  resolveWorkspaceRef,
  type McpSession,
} from "@/mcp/auth";

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

function sessionOf(authInfo: AuthInfo | undefined): McpSession {
  const extra = authInfo?.extra as McpSession | undefined;
  if (!extra?.userId) throw new Error("No autenticado");
  return extra;
}

async function monthlyAiTokens(workspaceId: string) {
  const admin = createAdminClient();
  const start = new Date();
  const monthStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)).toISOString();
  const { data, error } = await admin
    .from("usage_events")
    .select("quantity")
    .eq("workspace_id", workspaceId)
    .eq("kind", "ai_tokens")
    .gte("created_at", monthStart);
  if (error) throw new Error(error.message);
  return (data ?? []).reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
}

async function aiCredFor(userId: string): Promise<AiCred> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_openai_keys")
    .select("ciphertext, provider, base_url, chat_model, embedding_model, embedding_dim")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.ciphertext) {
    throw new Error("El dueño del token no tiene clave de IA en Ajustes.");
  }
  const raw = String(data.provider ?? "openai");
  const provider = isAiProviderId(raw) ? raw : "openai";
  const preset = AI_PRESETS[provider];
  return {
    apiKey: decryptSecret(data.ciphertext as string),
    provider,
    baseUrl: (data.base_url as string) || preset.baseUrl,
    chatModel: (data.chat_model as string) || preset.chatModel,
    embeddingModel: (data.embedding_model as string) || preset.embeddingModel,
    embeddingDim: Number(data.embedding_dim) || preset.embeddingDim,
  };
}

export function registerSynapseTools(server: McpServer) {
  server.registerTool(
    "list_workspaces",
    {
      title: "List workspaces",
      description:
        "List Synapse workspaces this agent token can access (id, name, slug, role).",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      try {
        const session = sessionOf(ctx.http?.authInfo);
        const admin = createAdminClient();
        let query = admin
          .from("workspace_members")
          .select("role, workspaces(id, name, slug, description, plan)")
          .eq("user_id", session.userId);
        if (session.workspaceId) query = query.eq("workspace_id", session.workspaceId);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        const rows = (data ?? []).map((row) => {
          const ws = row.workspaces as unknown as {
            id: string;
            name: string;
            slug: string;
            description: string | null;
            plan: string;
          } | null;
          return ws ? { ...ws, role: row.role } : null;
        }).filter(Boolean);
        return json(rows);
      } catch (e) {
        return err(e instanceof Error ? e.message : "Error");
      }
    },
  );

  server.registerTool(
    "list_documents",
    {
      title: "List documents",
      description: "List wiki documents in a workspace. Pass workspace id or slug.",
      inputSchema: z.object({
        workspace: z.string().describe("Workspace id or slug"),
      }),
    },
    async ({ workspace }, ctx) => {
      try {
        const session = sessionOf(ctx.http?.authInfo);
        const ws = await resolveWorkspaceRef(session, workspace);
        const admin = createAdminClient();
        const { data, error } = await admin
          .from("documents")
          .select("id, title, updated_at, created_at")
          .eq("workspace_id", ws.id)
          .order("updated_at", { ascending: false })
          .limit(100);
        if (error) throw new Error(error.message);
        return json({ workspace: ws.slug, documents: data ?? [] });
      } catch (e) {
        return err(e instanceof Error ? e.message : "Error");
      }
    },
  );

  server.registerTool(
    "get_document",
    {
      title: "Get document",
      description: "Read a wiki document title and plain_text by id.",
      inputSchema: z.object({
        document_id: z.string().uuid(),
      }),
    },
    async ({ document_id }, ctx) => {
      try {
        const session = sessionOf(ctx.http?.authInfo);
        const admin = createAdminClient();
        const { data, error } = await admin
          .from("documents")
          .select("id, workspace_id, title, plain_text, updated_at")
          .eq("id", document_id)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) throw new Error("Documento no encontrado");
        await assertWorkspaceAccess(session, data.workspace_id as string);
        return json(data);
      } catch (e) {
        return err(e instanceof Error ? e.message : "Error");
      }
    },
  );

  server.registerTool(
    "list_files",
    {
      title: "List files",
      description: "List indexed files in a workspace (name, status, mime).",
      inputSchema: z.object({
        workspace: z.string().describe("Workspace id or slug"),
      }),
    },
    async ({ workspace }, ctx) => {
      try {
        const session = sessionOf(ctx.http?.authInfo);
        const ws = await resolveWorkspaceRef(session, workspace);
        const admin = createAdminClient();
        const { data, error } = await admin
          .from("files")
          .select("id, name, mime_type, status, size, created_at, error_message")
          .eq("workspace_id", ws.id)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw new Error(error.message);
        return json({ workspace: ws.slug, files: data ?? [] });
      } catch (e) {
        return err(e instanceof Error ? e.message : "Error");
      }
    },
  );

  server.registerTool(
    "search",
    {
      title: "Hybrid search",
      description:
        "Full-text + semantic search over the workspace knowledge index (documents and files).",
      inputSchema: z.object({
        workspace: z.string().describe("Workspace id or slug"),
        query: z.string().min(1),
        limit: z.number().int().min(1).max(20).optional(),
      }),
    },
    async ({ workspace, query, limit }, ctx) => {
      try {
        const session = sessionOf(ctx.http?.authInfo);
        const ws = await resolveWorkspaceRef(session, workspace);
        const cred = await aiCredFor(session.userId);
        const [embedding] = await embedTexts([query], cred);
        const hits = await hybridSearchAsUser(
          createAdminClient(),
          session.userId,
          ws.id,
          query,
          embedding,
          limit ?? 8,
        );
        return json({
          workspace: ws.slug,
          hits: hits.map((h) => ({
            source_type: h.source_type,
            source_id: h.source_id,
            title: h.metadata?.title ?? h.source_type,
            score: h.score,
            content: h.content,
          })),
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : "Error");
      }
    },
  );

  server.registerTool(
    "ask",
    {
      title: "Ask the workspace",
      description:
        "Answer a question using only retrieved workspace chunks. Returns the answer and citations. Does not invent facts outside the index.",
      inputSchema: z.object({
        workspace: z.string().describe("Workspace id or slug"),
        question: z.string().min(1),
      }),
    },
    async ({ workspace, question }, ctx) => {
      try {
        const session = sessionOf(ctx.http?.authInfo);
        const ws = await resolveWorkspaceRef(session, workspace);
        const used = await monthlyAiTokens(ws.id);
        if (used >= FREE_PLAN.aiTokensPerMonth) {
          throw new Error("Límite de tokens del plan Free este mes.");
        }
        const cred = await aiCredFor(session.userId);
        const [embedding] = await embedTexts([question], cred);
        const admin = createAdminClient();
        const hits = await hybridSearchAsUser(admin, session.userId, ws.id, question, embedding, 8);
        const context = hits
          .map(
            (h, i) =>
              `[#${i + 1} ${h.source_type} ${String(h.metadata?.title ?? h.source_id)}]\n${h.content}`,
          )
          .join("\n\n");
        const client = compatibleClient(cred.apiKey, cred.baseUrl);
        const completion = await client.chat.completions.create({
          model: cred.chatModel,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "Eres Synapse, la IA del workspace. Responde SOLO con el contexto. Si no está en el contexto, dilo. Cita [#n]. Responde en el idioma de la pregunta.",
            },
            {
              role: "user",
              content: `Contexto:\n\n${context || "(sin resultados)"}\n\nPregunta: ${question}`,
            },
          ],
        });
        const answer = completion.choices[0]?.message?.content ?? "";
        const approxTokens = Math.ceil((question.length + answer.length + context.length) / 4);
        await admin.from("usage_events").insert({
          workspace_id: ws.id,
          user_id: session.userId,
          kind: "ai_tokens",
          quantity: approxTokens,
        });
        return json({
          answer,
          citations: hits.map((h, i) => ({
            n: i + 1,
            source_type: h.source_type,
            source_id: h.source_id,
            title: h.metadata?.title ?? h.source_type,
          })),
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : "Error");
      }
    },
  );

  server.registerTool(
    "list_channels",
    {
      title: "List chat channels",
      description: "List chat channels in a workspace.",
      inputSchema: z.object({
        workspace: z.string(),
      }),
    },
    async ({ workspace }, ctx) => {
      try {
        const session = sessionOf(ctx.http?.authInfo);
        const ws = await resolveWorkspaceRef(session, workspace);
        const admin = createAdminClient();
        const { data, error } = await admin
          .from("channels")
          .select("id, name, created_at")
          .eq("workspace_id", ws.id)
          .order("created_at");
        if (error) throw new Error(error.message);
        return json({ workspace: ws.slug, channels: data ?? [] });
      } catch (e) {
        return err(e instanceof Error ? e.message : "Error");
      }
    },
  );

  server.registerTool(
    "list_recent_messages",
    {
      title: "List recent messages",
      description: "Read the latest messages in a chat channel (read-only).",
      inputSchema: z.object({
        channel_id: z.string().uuid(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    },
    async ({ channel_id, limit }, ctx) => {
      try {
        const session = sessionOf(ctx.http?.authInfo);
        const admin = createAdminClient();
        const { data: channel, error: channelError } = await admin
          .from("channels")
          .select("id, workspace_id, name")
          .eq("id", channel_id)
          .maybeSingle();
        if (channelError) throw new Error(channelError.message);
        if (!channel) throw new Error("Canal no encontrado");
        await assertWorkspaceAccess(session, channel.workspace_id as string);
        const { data, error } = await admin
          .from("messages")
          .select("id, content, created_at, user_id")
          .eq("channel_id", channel_id)
          .order("created_at", { ascending: false })
          .limit(limit ?? 30);
        if (error) throw new Error(error.message);
        return json({
          channel: channel.name,
          messages: (data ?? []).slice().reverse(),
        });
      } catch (e) {
        return err(e instanceof Error ? e.message : "Error");
      }
    },
  );

  server.registerPrompt(
    "answer_from_workspace",
    {
      title: "Answer from workspace",
      description: "Search then answer using only workspace knowledge.",
      argsSchema: z.object({
        workspace: z.string(),
        question: z.string(),
      }),
    },
    async ({ workspace, question }) => ({
      description: "Grounded answer from Synapse",
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Use the Synapse MCP tools. Call search or ask on workspace "${workspace}" for: ${question}. Do not invent facts that are not in the retrieved chunks.`,
          },
        },
      ],
    }),
  );
}
