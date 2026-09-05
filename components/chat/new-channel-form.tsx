"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function NewChannelForm({
  workspaceId,
  slug,
}: {
  workspaceId: string;
  slug: string;
}) {
  const [name, setName] = useState("");
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const slugName = name.trim().toLowerCase().replace(/\s+/g, "-");
    const { data, error } = await supabase
      .from("channels")
      .insert({
        workspace_id: workspaceId,
        name: slugName,
        created_by: user?.id,
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setName("");
    router.push(`/${slug}/chat/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="nuevo-canal"
        required
      />
      <Button type="submit" variant="secondary" size="sm">
        Crear
      </Button>
    </form>
  );
}
