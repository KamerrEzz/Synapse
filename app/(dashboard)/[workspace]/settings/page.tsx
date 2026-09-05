import { getWorkspaceBySlug } from "@/lib/auth";
import { InviteForm, ProfileForm } from "@/components/settings/settings-forms";
import { Badge } from "@/components/ui/badge";
import { FREE_PLAN } from "@/lib/plans";
import type { WorkspaceInvitation, WorkspaceMember } from "@/types/database";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const ctx = await getWorkspaceBySlug(slug);
  const canInvite = ctx.role === "owner" || ctx.role === "admin";

  const { data: members } = await ctx.supabase
    .from("workspace_members")
    .select("workspace_id, user_id, role, joined_at, profiles(*)")
    .eq("workspace_id", ctx.workspace.id);

  const { data: invitations } = canInvite
    ? await ctx.supabase
        .from("workspace_invitations")
        .select("*")
        .eq("workspace_id", ctx.workspace.id)
        .is("accepted_at", null)
    : { data: [] as WorkspaceInvitation[] };

  const { data: tokenUsage } = await ctx.supabase.rpc("workspace_monthly_ai_tokens", {
    p_workspace_id: ctx.workspace.id,
  });

  return (
    <main className="space-y-12 px-8 py-8">
      <section>
        <h1 className="font-display text-3xl">Ajustes</h1>
        <p className="mt-1 text-sm text-mist">
          {ctx.workspace.name} · plan {ctx.workspace.plan}
        </p>
        <p className="mt-3 text-sm text-mist">
          Tokens IA este mes: {Number(tokenUsage ?? 0).toLocaleString("es")} /{" "}
          {FREE_PLAN.aiTokensPerMonth.toLocaleString("es")}
        </p>
      </section>
      <section>
        <h2 className="font-display text-2xl">Tu perfil</h2>
        <div className="mt-4">
          <ProfileForm
            fullName={ctx.profile?.full_name ?? ""}
            userId={ctx.user.id}
          />
        </div>
      </section>
      <section>
        <h2 className="font-display text-2xl">Miembros</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {(members as WorkspaceMember[] | null)?.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between py-3">
              <span>{m.profiles?.full_name || m.user_id}</span>
              <Badge>{m.role}</Badge>
            </li>
          ))}
        </ul>
        <InviteForm workspaceId={ctx.workspace.id} canInvite={canInvite} />
        {canInvite && (invitations as WorkspaceInvitation[] | null)?.length ? (
          <ul className="mt-4 text-sm text-mist">
            {(invitations as WorkspaceInvitation[]).map((inv) => (
              <li key={inv.id}>
                Pendiente: {inv.email} ({inv.role})
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
