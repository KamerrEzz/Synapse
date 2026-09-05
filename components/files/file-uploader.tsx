"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const ALLOWED = [
  "application/pdf",
  "text/markdown",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

export function FileUploader({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED.includes(file.type) && !file.name.match(/\.(pdf|md|txt|png|jpe?g|webp|gif)$/i)) {
      toast.error("Formato no soportado. Usa PDF, MD, TXT o imagen.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const id = crypto.randomUUID();
      const path = `${workspaceId}/${id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("workspace-files")
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("files").insert({
        id,
        workspace_id: workspaceId,
        name: file.name,
        path,
        mime_type: file.type,
        size: file.size,
        status: "processing",
        uploaded_by: user.id,
      });
      if (insertError) throw insertError;

      const res = await fetch("/api/process-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: id, workspaceId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "El archivo se subió pero no se pudo procesar");
      }
      toast.success("Archivo listo para la IA");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="inline-flex cursor-pointer">
      <input type="file" className="sr-only" onChange={onChange} disabled={busy} />
      <Button asChild disabled={busy}>
        <span>{busy ? "Procesando…" : "Subir archivo"}</span>
      </Button>
    </label>
  );
}
