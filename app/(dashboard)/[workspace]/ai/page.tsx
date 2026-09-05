import Link from "next/link";
import { getWorkspaceBySlug } from "@/lib/auth";
import { AiChat } from "@/components/ai/ai-chat";
import type { AiConversation, AiMessage } from "@/types/database";

export default async function AiPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const ctx = await getWorkspaceBySlug(slug);
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
          IA
        </Link>
        <ul className="mt-4 space-y-1">
          {(convos as AiConversation[] | null)?.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${slug}/ai/${c.id}`}
                className="block truncate rounded-md px-2 py-1.5 text-sm text-mist hover:text-paper"
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
          conversationId={null}
          initialMessages={[] as AiMessage[]}
        />
      </div>
    </div>
  );
}
