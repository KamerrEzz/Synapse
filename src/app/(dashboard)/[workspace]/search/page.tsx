import { getWorkspaceBySlug } from "@/lib/auth";
import { SearchBox } from "@/components/search/search-box";
import { PageHeader, pageNarrow } from "@/components/layout/page-chrome";
import { getWorkspaceAiAccess } from "@/lib/ai/user-key";
import { WorkspaceAiBanner } from "@/components/ai/workspace-ai-banner";

export default async function SearchPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const ctx = await getWorkspaceBySlug(slug);
  const access = await getWorkspaceAiAccess(ctx.supabase, ctx.workspace);

  return (
    <main className={pageNarrow}>
      <PageHeader
        title="Buscar"
        description="Full-text y semántica sobre el conocimiento del workspace."
      />
      <WorkspaceAiBanner
        slug={slug}
        access={access}
        personalCopy="La búsqueda semántica usa tu clave de IA."
      />
      <div className="mt-8">
        <SearchBox workspaceId={ctx.workspace.id} slug={slug} />
      </div>
    </main>
  );
}
