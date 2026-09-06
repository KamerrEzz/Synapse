"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { FileRow } from "@/types/database";

export function FileRowActions({ file }: { file: FileRow }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function retry() {
    setBusy(true);
    try {
      const res = await fetch("/api/process-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, workspaceId: file.workspace_id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "No se pudo reindexar");
      }
      toast.success("Archivo indexado");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo reindexar");
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("workspace-files")
        .createSignedUrl(file.path, 60);
      if (error || !data?.signedUrl) throw error ?? new Error("No se pudo firmar el enlace");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo descargar");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`¿Eliminar ${file.name}?`)) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: chunksError } = await supabase
        .from("knowledge_chunks")
        .delete()
        .eq("source_type", "file")
        .eq("source_id", file.id);
      if (chunksError) throw chunksError;
      const { error: storageError } = await supabase.storage
        .from("workspace-files")
        .remove([file.path]);
      if (storageError) throw storageError;
      const { error } = await supabase.from("files").delete().eq("id", file.id);
      if (error) throw error;
      toast.success("Archivo eliminado");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 gap-1">
      {file.status === "error" ? (
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void retry()}>
          Reintentar
        </Button>
      ) : null}
      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void download()}>
        Abrir
      </Button>
      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void remove()}>
        Eliminar
      </Button>
    </div>
  );
}
