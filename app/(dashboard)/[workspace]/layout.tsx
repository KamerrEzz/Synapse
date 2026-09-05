import type { ReactNode } from "react";
import { getWorkspaceBySlug } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const ctx = await getWorkspaceBySlug(workspace);

  const { data: memberships } = await ctx.supabase
    .from("workspace_members")
    .select("workspaces(id, name, slug)")
    .eq("user_id", ctx.user.id);

  const workspaces = (memberships ?? [])
    .map((row) => row.workspaces as unknown as { id: string; name: string; slug: string } | null)
    .filter(Boolean) as { id: string; name: string; slug: string }[];

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar
        workspace={ctx.workspace}
        role={ctx.role}
        profile={ctx.profile}
        workspaces={workspaces}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
