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

function mimeFromName(name: string) {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".md")) return "text/markdown";
  if (n.endsWith(".txt")) return "text/plain";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  return "";
}

function storageObjectName(original: string) {
  const trimmed = original.trim() || "archivo";
  const dot = trimmed.lastIndexOf(".");
  const base = (dot > 0 ? trimmed.slice(0, dot) : trimmed).slice(0, 80);
  const ext = dot > 0 ? trimmed.slice(dot, dot + 8) : "";
  const safe = `${base}${ext}`.replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_");
  return safe || "archivo";
}

function explainUploadError(err: unknown) {
  const raw = err instanceof Error ? err.message : String(err);
  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return "No se pudo enviar el archivo (red). En el móvil suele pasar si se cierra el selector demasiado pronto; vuelve a intentar.";
  }
  if (/mime type|not supported/i.test(raw)) {
    return "Storage rechazó el tipo de archivo. Prueba un PDF, MD, TXT o imagen.";
  }
  if (/row-level security|not allowed|unauthorized/i.test(raw)) {
    return "No tienes permiso para subir a este workspace.";
  }
  return raw || "Error al subir";
}

export function FileUploader({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const picked = input.files?.[0];
    if (!picked) return;
    const mime =
      (picked.type && ALLOWED.includes(picked.type) ? picked.type : mimeFromName(picked.name)) ||
      picked.type;
    if (!ALLOWED.includes(mime) && !picked.name.match(/\.(pdf|md|txt|png|jpe?g|webp|gif)$/i)) {
      toast.error("Formato no soportado. Usa PDF, MD, TXT o imagen.");
      input.value = "";
      return;
    }
    // Clone immediately: Android Chrome can drop the original File after the picker closes.
    const file = new File([picked], picked.name, {
      type: mime || picked.type || "application/octet-stream",
      lastModified: picked.lastModified,
    });
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const id = crypto.randomUUID();
      const path = `${workspaceId}/${id}/${storageObjectName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("workspace-files").upload(path, file, {
        upsert: false,
        contentType: mime || "application/pdf",
      });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("files").insert({
        id,
        workspace_id: workspaceId,
        name: file.name,
        path,
        mime_type: mime || file.type || null,
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
        throw new Error(
          body.error ||
            (res.status === 409
              ? "Añade tu clave de IA en Ajustes para indexar el archivo"
              : "El archivo se subió pero no se pudo procesar. Mira el detalle en la lista."),
        );
      }
      toast.success("Archivo listo para la IA");
      router.refresh();
    } catch (err) {
      toast.error(explainUploadError(err));
      router.refresh();
    } finally {
      input.value = "";
      setBusy(false);
    }
  }

  return (
    <label className="inline-flex cursor-pointer">
      <input
        type="file"
        className="sr-only"
        accept=".pdf,.md,.txt,.png,.jpg,.jpeg,.webp,.gif,application/pdf,text/plain,text/markdown,image/png,image/jpeg,image/webp,image/gif"
        onChange={onChange}
        disabled={busy}
      />
      <Button asChild disabled={busy}>
        <span>{busy ? "Procesando…" : "Subir archivo"}</span>
      </Button>
    </label>
  );
}
