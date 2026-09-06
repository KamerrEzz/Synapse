import { getWorkspaceBySlug } from "@/lib/auth";
import { AiChat } from "@/components/ai/ai-chat";
import { AiKeyGate } from "@/components/ai/ai-key-gate";
import { AiSidebar } from "@/components/ai/ai-sidebar";
import { SplitNav } from "@/components/layout/split-nav";
import { getWorkspaceAiAccess } from "@/lib/ai/user-key";
import Link from "next/link";
import type { AiConversation, AiMessage } from "@/types/database";

export default async function AiPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const ctx = await getWorkspaceBySlug(slug);
  const access = await getWorkspaceAiAccess(ctx.supabase, ctx.workspace);
  const { data: convos } = await ctx.supabase
    .from("ai_conversations")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: false });

  const conversations = (convos ?? []) as AiConversation[];

  return (
    <div className="h-full min-h-0">
      <SplitNav
        panelTitle="Conversaciones"
        panel={<AiSidebar slug={slug} conversations={conversations} activeId={null} />}
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
            conversationId={null}
            initialMessages={[] as AiMessage[]}
          />
        ) : (
          <AiKeyGate slug={slug} mode={access.mode} isOwner={ctx.role === "owner"} />
        )}
      </SplitNav>
    </div>
  );
}
