import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/auth";
import { ChatRoom } from "@/components/chat/chat-room";
import { NewChannelForm } from "@/components/chat/new-channel-form";
import { cn } from "@/lib/utils";
import type { Channel, Message, Profile } from "@/types/database";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ workspace: string; channelId: string }>;
}) {
  const { workspace: slug, channelId } = await params;
  const ctx = await getWorkspaceBySlug(slug);

  const { data: channels } = await ctx.supabase
    .from("channels")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at");

  const channelList = (channels ?? []) as Channel[];
  const channel = channelList.find((c) => c.id === channelId);
  if (!channel) notFound();

  const { data: messages } = await ctx.supabase
    .from("messages")
    .select("*, profiles(*)")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true })
    .limit(200);

  return (
    <div className="flex h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-shell">
        <div className="border-b border-line px-4 py-4">
          <p className="text-[11px] text-mist">Canales</p>
        </div>
        <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {channelList.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${slug}/chat/${c.id}`}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm",
                  c.id === channelId
                    ? "bg-raised text-paper shadow-[inset_2px_0_0_0_var(--spark)]"
                    : "text-mist hover:bg-raised/70 hover:text-paper",
                )}
              >
                <span className="text-spark">#</span>
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
        <div className="border-t border-line p-3">
          <NewChannelForm workspaceId={ctx.workspace.id} slug={slug} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-ink">
        <header className="border-b border-line bg-shell px-6 py-3">
          <p className="text-sm font-medium">
            <span className="text-spark">#</span>
            {channel.name}
          </p>
        </header>
        <ChatRoom
          channelId={channel.id}
          workspaceId={ctx.workspace.id}
          userId={ctx.user.id}
          profile={ctx.profile as Profile | null}
          initialMessages={(messages ?? []) as Message[]}
        />
      </div>
    </div>
  );
}
