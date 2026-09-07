"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ProfileForm({
  fullName,
  avatarUrl,
  userId,
}: {
  fullName: string;
  avatarUrl?: string | null;
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
      <div className="space-y-2">
        <label htmlFor="full-name" className="text-sm text-mist">
          Nombre
        </label>
        <Input
          id="full-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nombre"
        />
      </div>
      <label className="block text-sm text-mist">
        <span className="flex items-center gap-3">
          <Avatar
            src={avatarUrl}
            alt={name || "Avatar"}
            fallback={name || "U"}
            className="h-12 w-12 text-sm"
          />
          <span>Avatar</span>
        </span>
        <input
          type="file"
          accept="image/*"
          className="mt-2 block w-full text-sm text-paper file:mr-3 file:rounded-lg file:border-0 file:bg-raised file:px-3 file:py-1.5 file:text-paper"
          onChange={onAvatar}
        />
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
    <div className="mt-5 space-y-3">
      <form onSubmit={invite} className="flex max-w-md flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          required
          placeholder="correo@equipo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Correo para invitar"
          className="min-w-0"
        />
        <Button type="submit" className="shrink-0">
          Invitar
        </Button>
      </form>
      {link ? (
        <p className="break-all text-xs text-mist">
          Enlace: <span className="text-paper">{link}</span>
        </p>
      ) : null}
    </div>
  );
}
