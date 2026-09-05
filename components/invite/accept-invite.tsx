"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AcceptInvite({ token, email }: { token: string; email: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function accept() {
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }
    toast.success("Te uniste al workspace");
    const { data: ws } = await supabase
      .from("workspaces")
      .select("slug")
      .eq("id", data)
      .maybeSingle();
    router.replace(ws?.slug ? `/${ws.slug}/documents` : "/workspaces");
  }

  return (
    <div className="max-w-md rounded-2xl border border-line bg-shell p-8">
      <h1 className="font-display text-3xl">Invitación</h1>
      <p className="mt-3 text-sm text-mist">
        Esta invitación es para <strong className="text-paper">{email}</strong>. Entra con esa
        cuenta y acepta.
      </p>
      <Button className="mt-6" onClick={accept} disabled={busy}>
        Unirme al workspace
      </Button>
    </div>
  );
}
