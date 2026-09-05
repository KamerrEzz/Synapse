import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { getWorkspaceBySlug } from "@/lib/auth";
import { NewDocumentButton } from "@/components/documents/new-document-button";
import { PageHeader } from "@/components/layout/page-chrome";
import { EmptyState } from "@/components/layout/empty-state";
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
    <main className="mx-auto max-w-5xl px-8 py-8">
      <PageHeader
        title="Documentos"
        description="La wiki del workspace. Edición simultánea con Yjs."
        action={<NewDocumentButton workspaceId={ctx.workspace.id} slug={slug} />}
      />
      {documents.length === 0 ? (
        <EmptyState
          title="La wiki está vacía"
          description="Crea la primera página para empezar a escribir en equipo."
          action={<NewDocumentButton workspaceId={ctx.workspace.id} slug={slug} />}
        />
      ) : (
        <ul className="mt-8 overflow-hidden rounded-2xl border border-line bg-shell">
          {documents.map((doc) => (
            <li key={doc.id} className="border-b border-line last:border-b-0">
              <Link
                href={`/${slug}/documents/${doc.id}`}
                className="flex items-baseline justify-between gap-4 px-5 py-4 hover:bg-raised/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-base text-paper">{doc.title || "Sin título"}</p>
                  <p className="mt-1 line-clamp-1 text-sm text-mist">
                    {doc.plain_text || "Vacío"}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-mist">
                  {formatDistanceToNow(new Date(doc.updated_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
