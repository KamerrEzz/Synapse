import { notFound } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/auth";
import { AiChat } from "@/components/ai/ai-chat";
import { AiKeyGate } from "@/components/ai/ai-key-gate";
import { AiSidebar } from "@/components/ai/ai-sidebar";
import { getUserOpenAIMeta } from "@/lib/ai/user-key";
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

  const keyMeta = await getUserOpenAIMeta(ctx.supabase);

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

  return (
    <div className="flex h-screen">
      <AiSidebar
        slug={slug}
        conversations={(convos ?? []) as AiConversation[]}
        activeId={conversationId}
      />
      <div className="min-w-0 flex-1">
        {keyMeta.configured ? (
          <AiChat
            workspaceId={ctx.workspace.id}
            slug={slug}
            conversationId={conversationId}
            initialMessages={(messages ?? []) as AiMessage[]}
          />
        ) : (
          <AiKeyGate slug={slug} />
        )}
      </div>
    </div>
  );
}
