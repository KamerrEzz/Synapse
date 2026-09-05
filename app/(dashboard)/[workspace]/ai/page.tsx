import { getWorkspaceBySlug } from "@/lib/auth";
import { AiChat } from "@/components/ai/ai-chat";
import { AiKeyGate } from "@/components/ai/ai-key-gate";
import { AiSidebar } from "@/components/ai/ai-sidebar";
import { getUserOpenAIMeta } from "@/lib/ai/user-key";
import type { AiConversation, AiMessage } from "@/types/database";

export default async function AiPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const ctx = await getWorkspaceBySlug(slug);
  const keyMeta = await getUserOpenAIMeta(ctx.supabase);
  const { data: convos } = await ctx.supabase
    .from("ai_conversations")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: false });

  const conversations = (convos ?? []) as AiConversation[];

  return (
    <div className="flex h-screen">
      <AiSidebar slug={slug} conversations={conversations} activeId={null} />
      <div className="min-w-0 flex-1">
        {keyMeta.configured ? (
          <AiChat
            workspaceId={ctx.workspace.id}
            slug={slug}
            conversationId={null}
            initialMessages={[] as AiMessage[]}
          />
        ) : (
          <AiKeyGate slug={slug} />
        )}
      </div>
    </div>
  );
}
