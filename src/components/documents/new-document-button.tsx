"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function NewDocumentButton({
  workspaceId,
  slug,
}: {
  workspaceId: string;
  slug: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { data, error } = await supabase
        .from("documents")
        .insert({
          workspace_id: workspaceId,
          title: "Sin título",
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      router.push(`/${slug}/documents/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el documento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={create} disabled={loading}>
      Nuevo documento
    </Button>
  );
}
