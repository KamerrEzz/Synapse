import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/auth";
import { ChatRoom } from "@/components/chat/chat-room";
import { NewChannelForm } from "@/components/chat/new-channel-form";
import { SplitNav } from "@/components/layout/split-nav";
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

  const panel = (
    <>
      <div className="flex items-center gap-2 border-b border-line px-4 py-4">
        <span className="h-2 w-2 rounded-full bg-spark" aria-hidden />
        <h2 className="font-display text-lg tracking-tight">Canales</h2>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {channelList.map((c) => (
          <li key={c.id}>
            <Link
              href={`/${slug}/chat/${c.id}`}
              className={cn(
                "block rounded-lg px-3 py-2.5 text-sm md:py-2",
                c.id === channelId
                  ? "bg-raised text-paper"
                  : "text-mist hover:bg-raised/70 hover:text-paper",
              )}
            >
              <span className={c.id === channelId ? "text-spark" : "text-mist"}>#</span>
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <NewChannelForm workspaceId={ctx.workspace.id} slug={slug} />
      </div>
    </>
  );

  return (
    <div className="h-full min-h-0">
      <SplitNav panelTitle="Canales" currentTitle={`#${channel.name}`} panel={panel}>
        <header className="hidden shrink-0 border-b border-line bg-shell px-6 py-3 md:block">
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
      </SplitNav>
    </div>
  );
}
