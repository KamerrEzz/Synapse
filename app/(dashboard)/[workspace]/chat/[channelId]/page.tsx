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
      <aside className="w-56 shrink-0 border-r border-line bg-shell p-4">
        <p className="text-xs text-mist">Canales</p>
        <ul className="mt-3 space-y-1">
          {channelList.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${slug}/chat/${c.id}`}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-sm",
                  c.id === channelId ? "bg-raised text-spark" : "text-mist hover:text-paper",
                )}
              >
                #{c.name}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <NewChannelForm workspaceId={ctx.workspace.id} slug={slug} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-line px-6 py-3 font-medium">#{channel.name}</header>
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
