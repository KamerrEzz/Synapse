import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { getWorkspaceBySlug } from "@/lib/auth";
import { FileUploader } from "@/components/files/file-uploader";
import { Badge } from "@/components/ui/badge";
import type { FileRow } from "@/types/database";

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
    <main className="px-8 py-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl">Archivos</h1>
          <p className="mt-1 text-sm text-mist">
            PDF, Markdown, texto e imágenes. El texto se indexa para la IA.
          </p>
        </div>
        <FileUploader workspaceId={ctx.workspace.id} />
      </div>
      {files.length === 0 ? (
        <p className="mt-16 text-mist">Todavía no hay archivos en este workspace.</p>
      ) : (
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {files.map((file) => (
            <li key={file.id} className="flex items-center justify-between py-4">
              <div>
                <p>{file.name}</p>
                <p className="text-xs text-mist">
                  {file.mime_type} ·{" "}
                  {formatDistanceToNow(new Date(file.created_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </p>
                {file.error_message ? (
                  <p className="text-xs text-danger">{file.error_message}</p>
                ) : null}
              </div>
              <Badge
                className={
                  file.status === "ready"
                    ? "border-ok text-ok"
                    : file.status === "error"
                      ? "border-danger text-danger"
                      : ""
                }
              >
                {file.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
