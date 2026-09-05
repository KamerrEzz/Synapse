"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ProfileForm({
  fullName,
  userId,
}: {
  fullName: string;
  userId: string;
}) {
  const [name, setName] = useState(fullName);
  const router = useRouter();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name })
      .eq("id", userId);
    if (error) toast.error(error.message);
    else {
      toast.success("Perfil actualizado");
      router.refresh();
    }
  }

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const supabase = createClient();
    const path = `${userId}/avatar-${Date.now()}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
    });
    if (upErr) {
      toast.error(upErr.message);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl })
      .eq("id", userId);
    if (error) toast.error(error.message);
    else {
      toast.success("Avatar actualizado");
      router.refresh();
    }
  }

  return (
    <form onSubmit={save} className="max-w-md space-y-4">
      <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Nombre" />
      <label className="block text-sm text-mist">
        Avatar
        <input type="file" accept="image/*" className="mt-2 block text-paper" onChange={onAvatar} />
      </label>
      <Button type="submit">Guardar perfil</Button>
    </form>
  );
}

export function InviteForm({
  workspaceId,
  canInvite,
}: {
  workspaceId: string;
  canInvite: boolean;
}) {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  if (!canInvite) return null;

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/invite-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, email, role: "member" }),
    });
    const body = await res.json();
    if (!res.ok) {
      toast.error(body.error || "No se pudo invitar");
      return;
    }
    setLink(body.url);
    toast.success("Invitación creada");
    setEmail("");
  }

  return (
    <form onSubmit={invite} className="mt-4 max-w-md space-y-3">
      <Input
        type="email"
        required
        placeholder="correo@equipo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit">Invitar</Button>
      {link ? (
        <p className="break-all text-xs text-mist">
          Enlace: <span className="text-paper">{link}</span>
        </p>
      ) : null}
    </form>
  );
}
