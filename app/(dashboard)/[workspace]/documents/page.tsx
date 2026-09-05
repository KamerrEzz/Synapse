import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { getWorkspaceBySlug } from "@/lib/auth";
import { NewDocumentButton } from "@/components/documents/new-document-button";
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
    <main className="px-8 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Documentos</h1>
          <p className="mt-1 text-sm text-mist">La wiki del workspace. Edición simultánea con Yjs.</p>
        </div>
        <NewDocumentButton workspaceId={ctx.workspace.id} slug={slug} />
      </div>
      {documents.length === 0 ? (
        <p className="mt-16 max-w-md text-mist">
          Aún no hay páginas. Crea la primera para empezar a escribir en equipo.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {documents.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/${slug}/documents/${doc.id}`}
                className="flex items-baseline justify-between gap-4 py-4 hover:text-spark"
              >
                <div>
                  <p className="text-lg">{doc.title || "Sin título"}</p>
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
