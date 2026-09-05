import { getWorkspaceBySlug } from "@/lib/auth";
import { SearchBox } from "@/components/search/search-box";
import { PageHeader } from "@/components/layout/page-chrome";
import { getUserOpenAIMeta } from "@/lib/ai/user-key";
import Link from "next/link";

export default async function SearchPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const ctx = await getWorkspaceBySlug(slug);
  const keyMeta = await getUserOpenAIMeta(ctx.supabase);

  return (
    <main className="mx-auto max-w-3xl px-8 py-8">
      <PageHeader
        title="Buscar"
        description="Full-text y semántica sobre el conocimiento del workspace."
      />
      {!keyMeta.configured ? (
        <p className="mt-8 rounded-xl border border-line bg-shell px-4 py-3 text-sm text-mist">
          La búsqueda semántica usa tu clave de IA.{" "}
          <Link href={`/${slug}/settings`} className="text-spark hover:underline">
            Añádela en Ajustes
          </Link>
          .
        </p>
      ) : null}
      <div className="mt-8">
        <SearchBox workspaceId={ctx.workspace.id} slug={slug} />
      </div>
    </main>
  );
}
