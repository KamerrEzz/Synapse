import { File, FileImage, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { PageHeader, pageWide } from "@/components/layout/page-chrome";
import { EmptyState } from "@/components/layout/empty-state";
import { FileUploader } from "@/components/files/file-uploader";
import { FileRowActions } from "@/components/files/file-row-actions";
import { Badge } from "@/components/ui/badge";
import { getWorkspaceBySlug } from "@/lib/auth";
import { getWorkspaceAiAccess } from "@/lib/ai/user-key";
import { WorkspaceAiBanner } from "@/components/ai/workspace-ai-banner";
import { FILE_STATUS_LABEL } from "@/lib/labels";
import type { FileRow } from "@/types/database";

function FileIcon({ mime }: { mime: string | null }) {
  const cls = "h-4 w-4 text-mist";
  if (mime?.startsWith("image/")) return <FileImage className={cls} />;
  if (mime === "application/pdf" || mime?.startsWith("text/")) return <FileText className={cls} />;
  return <File className={cls} />;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default async function FilesPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const ctx = await getWorkspaceBySlug(slug);
  const access = await getWorkspaceAiAccess(ctx.supabase, ctx.workspace);
  const { data } = await ctx.supabase
    .from("files")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });
  const files = (data ?? []) as FileRow[];

  return (
    <main className={pageWide}>
      <PageHeader
        title="Archivos"
        description="PDF, Markdown, texto e imágenes. El texto se indexa para la IA con tu clave."
        action={<FileUploader workspaceId={ctx.workspace.id} />}
      />
      <WorkspaceAiBanner
        slug={slug}
        access={access}
        personalCopy="Para indexar un PDF hace falta tu clave de IA. Sin ella la subida puede llegar, pero el archivo queda en error."
      />
      {files.length === 0 ? (
        <EmptyState
          title="Nada indexado todavía"
          description="Sube un PDF, Markdown, texto o imagen. El texto se trocea y se incrusta para que la IA del equipo pueda citarlo."
          action={<FileUploader workspaceId={ctx.workspace.id} />}
        />
      ) : (
        <ul className="mt-2 divide-y divide-line border-b border-line">
          {files.map((file) => (
            <li key={file.id} className="-mx-4 px-4 py-5 transition-colors hover:bg-raised/50 sm:py-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-raised">
                  <FileIcon mime={file.mime_type} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
                    <p className="min-w-0 truncate text-base font-medium text-paper">
                      {file.name}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
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
                    </div>
                  </div>
                  <p className="mt-1 text-xs tabular-nums text-mist">
                    {file.mime_type || "archivo"}
                    {file.size ? ` · ${formatBytes(file.size)}` : ""}
                    {" · "}
                    {formatDistanceToNow(new Date(file.created_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                  {file.mime_type?.startsWith("image/") ? (
                    <p className="mt-1 text-xs text-mist">
                      Las imágenes no se indexan (sin OCR).
                    </p>
                  ) : null}
                  {file.error_message ? (
                    <p className="mt-1 text-xs text-danger">{file.error_message}</p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}