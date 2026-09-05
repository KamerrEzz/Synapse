"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_workspace", {
        p_name: name,
        p_slug: slugify(name) || null,
      });
      if (error) throw error;
      const slug = (data as { slug: string }).slug;
      toast.success("Workspace creado");
      router.push(`/${slug}/documents`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-line bg-shell p-6">
      <div>
        <h2 className="font-display text-2xl">Nuevo workspace</h2>
        <p className="mt-1 text-sm text-mist">Se crea el canal general y tú quedas como owner.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ws-name">Nombre</Label>
        <Input
          id="ws-name"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Estudio Norte"
        />
      </div>
      <Button type="submit" disabled={loading}>
        Crear workspace
      </Button>
    </form>
  );
}
