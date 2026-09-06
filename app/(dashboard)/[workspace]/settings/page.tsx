import { getWorkspaceBySlug } from "@/lib/auth";
import { InviteForm, ProfileForm } from "@/components/settings/settings-forms";
import { OpenAIKeyForm } from "@/components/settings/openai-key-form";
import { PageHeader, Panel, pageNarrow } from "@/components/layout/page-chrome";
import { Badge } from "@/components/ui/badge";
import { FREE_PLAN } from "@/lib/plans";
import { ROLE_LABEL } from "@/lib/labels";
import type { WorkspaceInvitation, WorkspaceMember, WorkspaceRole } from "@/types/database";

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
    <main className={`${pageNarrow} space-y-6`}>
      <PageHeader
        title="Ajustes"
        description={`${ctx.workspace.name} · plan ${ctx.workspace.plan}. Tokens IA este mes: ${Number(tokenUsage ?? 0).toLocaleString("es")} / ${FREE_PLAN.aiTokensPerMonth.toLocaleString("es")}.`}
      />

      <Panel>
        <h2 className="font-display text-xl">Clave de IA</h2>
        <div className="mt-4">
          <OpenAIKeyForm />
        </div>
      </Panel>

      <Panel>
        <h2 className="font-display text-xl">Tu perfil</h2>
        <div className="mt-4">
          <ProfileForm
            fullName={ctx.profile?.full_name ?? ""}
            userId={ctx.user.id}
          />
        </div>
      </Panel>

      <Panel>
        <h2 className="font-display text-xl">Miembros</h2>
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line">
          {(members as WorkspaceMember[] | null)?.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between gap-3 bg-raised/40 px-4 py-3">
              <span className="min-w-0 truncate text-sm">{m.profiles?.full_name || m.user_id}</span>
              <Badge>{ROLE_LABEL[m.role as WorkspaceRole] ?? m.role}</Badge>
            </li>
          ))}
        </ul>
        <InviteForm workspaceId={ctx.workspace.id} canInvite={canInvite} />
        {canInvite && (invitations as WorkspaceInvitation[] | null)?.length ? (
          <ul className="mt-4 space-y-1 text-sm text-mist">
            {(invitations as WorkspaceInvitation[]).map((inv) => (
              <li key={inv.id}>
                Pendiente: {inv.email} ({ROLE_LABEL[inv.role] ?? inv.role})
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>
    </main>
  );
}
