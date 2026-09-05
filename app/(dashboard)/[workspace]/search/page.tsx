import { getWorkspaceBySlug } from "@/lib/auth";
import { SearchBox } from "@/components/search/search-box";

export default async function SearchPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const ctx = await getWorkspaceBySlug(slug);

  return (
    <main className="px-8 py-8">
      <h1 className="font-display text-3xl">Buscar</h1>
      <p className="mt-1 text-sm text-mist">Full-text y semántica sobre el conocimiento del workspace.</p>
      <div className="mt-8">
        <SearchBox workspaceId={ctx.workspace.id} slug={slug} />
      </div>
    </main>
  );
}
