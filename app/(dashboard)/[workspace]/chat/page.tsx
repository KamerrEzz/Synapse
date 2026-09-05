import Link from "next/link";
import { redirect } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/auth";
import { NewChannelForm } from "@/components/chat/new-channel-form";
import { cn } from "@/lib/utils";
import type { Channel } from "@/types/database";

export default async function ChatIndexPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const ctx = await getWorkspaceBySlug(slug);
  const { data } = await ctx.supabase
    .from("channels")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at");
  const channels = (data ?? []) as Channel[];
  const general = channels.find((c) => c.name === "general") ?? channels[0];
  if (general) redirect(`/${slug}/chat/${general.id}`);

  return (
    <main className="px-8 py-8">
      <h1 className="font-display text-3xl">Chat</h1>
      <p className="mt-2 text-mist">Crea el primer canal del workspace.</p>
      <div className="mt-8 max-w-sm">
        <NewChannelForm workspaceId={ctx.workspace.id} slug={slug} />
      </div>
      <ul className="mt-6">
        {channels.map((c) => (
          <li key={c.id}>
            <Link
              href={`/${slug}/chat/${c.id}`}
              className={cn("text-sm hover:text-spark")}
            >
              #{c.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
