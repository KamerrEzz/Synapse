import { getWorkspaceBySlug } from "@/lib/auth";
import { NewChannelForm } from "@/components/chat/new-channel-form";
import { PageHeader } from "@/components/layout/page-chrome";
import { EmptyState } from "@/components/layout/empty-state";
import { redirect } from "next/navigation";
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
    <main className="mx-auto max-w-lg px-8 py-8">
      <PageHeader title="Chat" description="Crea el primer canal del workspace." />
      <EmptyState
        title="Sin canales"
        description="Un canal general suele ser el primer sitio donde escribe el equipo."
        action={<NewChannelForm workspaceId={ctx.workspace.id} slug={slug} />}
      />
    </main>
  );
}
