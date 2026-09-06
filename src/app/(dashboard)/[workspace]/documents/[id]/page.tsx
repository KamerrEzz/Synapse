import { notFound } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/auth";
import { CollaborativeEditor } from "@/components/documents/collaborative-editor";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace: slug, id } = await params;
  const ctx = await getWorkspaceBySlug(slug);
  const { data: doc } = await ctx.supabase
    .from("documents")
    .select("id, title, workspace_id")
    .eq("id", id)
    .eq("workspace_id", ctx.workspace.id)
    .maybeSingle();

  if (!doc) notFound();

  return (
    <CollaborativeEditor
      documentId={doc.id}
      workspaceId={ctx.workspace.id}
      slug={slug}
      initialTitle={doc.title}
      profile={ctx.profile}
      userId={ctx.user.id}
    />
  );
}
