import { File, FileImage, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { PageHeader } from "@/components/layout/page-chrome";
import { EmptyState } from "@/components/layout/empty-state";
import { FileUploader } from "@/components/files/file-uploader";
import { FileRowActions } from "@/components/files/file-row-actions";
import { Badge } from "@/components/ui/badge";
import { getWorkspaceBySlug } from "@/lib/auth";
import { FILE_STATUS_LABEL } from "@/lib/labels";
import type { FileRow } from "@/types/database";

function FileIcon({ mime }: { mime: string | null }) {
  const cls = "h-4 w-4 text-spark";
  if (mime?.startsWith("image/")) return <FileImage className={cls} />;
  if (mime === "application/pdf" || mime?.startsWith("text/")) return <FileText className={cls} />;
  return <File className={cls} />;
}

export default async function FilesPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const ctx = await getWorkspaceBySlug(slug);
  const { data } = await ctx.supabase
    .from("files")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });
  const files = (data ?? []) as FileRow[];

  return (
    <main className="mx-auto max-w-5xl px-8 py-8">
      <PageHeader
        title="Archivos"
        description="PDF, Markdown, texto e imágenes. El texto se indexa para la IA con tu clave."
        action={<FileUploader workspaceId={ctx.workspace.id} />}
      />
      {files.length === 0 ? (
        <EmptyState
          title="Nada indexado todavía"
          description="Sube un PDF, Markdown, texto o imagen. El texto se trocea y se incrusta para que la IA del equipo pueda citarlo."
          action={<FileUploader workspaceId={ctx.workspace.id} />}
        />
      ) : (
        <ul className="mt-8 overflow-hidden rounded-2xl border border-line bg-shell">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-b-0 hover:bg-raised/50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-raised">
                <FileIcon mime={file.mime_type} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-paper">{file.name}</p>
                <p className="mt-0.5 text-xs text-mist">
                  {file.mime_type || "archivo"} ·{" "}
                  {formatDistanceToNow(new Date(file.created_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </p>
                {file.error_message ? (
                  <p className="mt-1 text-xs text-danger">{file.error_message}</p>
                ) : null}
              </div>
              <Badge
                className={
                  file.status === "ready"
                    ? "border-ok/50 text-ok"
                    : file.status === "error"
                      ? "border-danger/50 text-danger"
                      : "border-spark/40 text-spark"
                }
              >
                {FILE_STATUS_LABEL[file.status]}
              </Badge>
              <FileRowActions file={file} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
