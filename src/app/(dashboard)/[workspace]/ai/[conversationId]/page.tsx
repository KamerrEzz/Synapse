import { notFound } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/auth";
import { AiChat } from "@/components/ai/ai-chat";
import { AiKeyGate } from "@/components/ai/ai-key-gate";
import { AiSidebar } from "@/components/ai/ai-sidebar";
import { SplitNav } from "@/components/layout/split-nav";
import { getWorkspaceAiAccess } from "@/lib/ai/user-key";
import Link from "next/link";
import type { AiConversation, AiMessage } from "@/types/database";

export default async function AiConversationPage({
  params,
}: {
  params: Promise<{ workspace: string; conversationId: string }>;
}) {
  const { workspace: slug, conversationId } = await params;
  const ctx = await getWorkspaceBySlug(slug);
  const { data: conversation } = await ctx.supabase
    .from("ai_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  if (!conversation) notFound();

  const access = await getWorkspaceAiAccess(ctx.supabase, ctx.workspace);

  const { data: messages } = await ctx.supabase
    .from("ai_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at");

  const { data: convos } = await ctx.supabase
    .from("ai_conversations")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: false });

  const row = conversation as AiConversation;

  return (
    <div className="h-full min-h-0">
      <SplitNav
        panelTitle="Conversaciones"
        currentTitle={row.title || "Conversación"}
        panel={
          <AiSidebar
            slug={slug}
            conversations={(convos ?? []) as AiConversation[]}
            activeId={conversationId}
          />
        }
        trailing={
          <Link
            href={`/${slug}/ai`}
            className="inline-flex h-11 items-center rounded-lg bg-spark px-3 text-sm font-medium text-ink"
          >
            Nueva
          </Link>
        }
      >
        {access.configured ? (
          <AiChat
            workspaceId={ctx.workspace.id}
            slug={slug}
            conversationId={conversationId}
            initialMessages={(messages ?? []) as AiMessage[]}
          />
        ) : (
          <AiKeyGate slug={slug} mode={access.mode} isOwner={ctx.role === "owner"} />
        )}
      </SplitNav>
    </div>
  );
}
