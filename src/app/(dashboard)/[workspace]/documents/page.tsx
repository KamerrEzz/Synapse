import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { getWorkspaceBySlug } from "@/lib/auth";
import { NewDocumentButton } from "@/components/documents/new-document-button";
import { PageHeader, pageWide } from "@/components/layout/page-chrome";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import type { DocumentRow } from "@/types/database";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const ctx = await getWorkspaceBySlug(slug);
  const { data } = await ctx.supabase
    .from("documents")
    .select("id, workspace_id, title, plain_text, created_by, is_public, created_at, updated_at")
    .eq("workspace_id", ctx.workspace.id)
    .order("updated_at", { ascending: false });

  const documents = (data ?? []) as DocumentRow[];

  return (
    <main className={pageWide}>
      <PageHeader
        title="Documentos"
        description={`La wiki del workspace · ${documents.length} ${documents.length === 1 ? "documento" : "documentos"}. Edición simultánea con Yjs.`}
        action={<NewDocumentButton workspaceId={ctx.workspace.id} slug={slug} />}
      />
      {documents.length === 0 ? (
        <EmptyState
          title="La wiki está vacía"
          description="Crea la primera página para empezar a escribir en equipo."
          action={<NewDocumentButton workspaceId={ctx.workspace.id} slug={slug} />}
        />
      ) : (
        <ul className="mt-2 divide-y divide-line border-b border-line">
          {documents.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/${slug}/documents/${doc.id}`}
                className="group -mx-4 flex flex-col gap-1 px-4 py-5 transition-colors hover:bg-raised/50 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:py-6"
              >
                <span className="min-w-0">
                  <span className="block truncate font-display text-xl font-medium tracking-tight text-paper transition-colors group-hover:text-spark-hover sm:text-2xl">
                    {doc.title || "Sin título"}
                  </span>
                  <span className="mt-1 block line-clamp-2 text-sm leading-relaxed text-mist">
                    {doc.plain_text || "Vacío"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 sm:pl-4">
                  {doc.is_public ? <Badge>Público</Badge> : null}
                  <span className="text-xs text-mist">
                    {formatDistanceToNow(new Date(doc.updated_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}