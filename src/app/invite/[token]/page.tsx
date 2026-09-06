import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AcceptInvite } from "@/components/invite/accept-invite";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .rpc("get_invitation_preview", { p_token: token })
    .maybeSingle();
  const invitation = data as {
    email: string;
    workspace_name: string;
    expires_at: string;
    accepted_at: string | null;
  } | null;

  if (!invitation) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 sm:px-6">
        <p className="text-mist">Invitación no encontrada.</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-4 sm:px-6">
        <p className="max-w-md text-center text-mist">
          Inicia sesión con {invitation.email} para unirte a{" "}
          {invitation.workspace_name ?? "un workspace"}.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
          className="mt-6 text-spark underline"
        >
          Ir a entrar
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 sm:px-6">
      <AcceptInvite token={token} email={invitation.email} />
    </main>
  );
}
