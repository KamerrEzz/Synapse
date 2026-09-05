import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/auth";
import { AiChat } from "@/components/ai/ai-chat";
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
      <aside className="w-56 shrink-0 border-r border-line bg-shell p-4">
        <Link href={`/${slug}/ai`} className="font-display text-lg">
          Nueva pregunta
        </Link>
        <ul className="mt-4 space-y-1">
          {(convos as AiConversation[] | null)?.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${slug}/ai/${c.id}`}
                className={`block truncate rounded-md px-2 py-1.5 text-sm ${
                  c.id === conversationId ? "bg-raised text-spark" : "text-mist hover:text-paper"
                }`}
              >
                {c.title || "Conversación"}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <div className="min-w-0 flex-1">
        <AiChat
          workspaceId={ctx.workspace.id}
          slug={slug}
          conversationId={conversationId}
          initialMessages={(messages ?? []) as AiMessage[]}
        />
      </div>
    </div>
  );
}
