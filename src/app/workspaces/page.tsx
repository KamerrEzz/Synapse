import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form";
import { ROLE_LABEL } from "@/lib/labels";
import type { WorkspaceRole } from "@/types/database";

export default async function WorkspacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("role, workspaces(*)")
    .eq("user_id", user.id);

  const workspaces = (memberships ?? [])
    .map((row) => {
      const ws = row.workspaces as unknown as {
        id: string;
        name: string;
        slug: string;
        description: string | null;
      } | null;
      if (!ws) return null;
      return { ...ws, role: row.role as string };
    })
    .filter(Boolean) as Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    role: string;
  }>;

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl sm:text-4xl">Tus workspaces</h1>
      <p className="mt-2 text-mist">Elige uno o crea el primero para el equipo.</p>
      <ul className="mt-10 space-y-3">
        {workspaces.map((ws) => (
          <li key={ws.id}>
            <Link
              href={`/${ws.slug}/documents`}
              className="flex flex-col gap-2 rounded-xl border border-line bg-shell px-4 py-4 hover:border-spark/50 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div>
                <p className="font-medium">{ws.name}</p>
                <p className="text-sm text-mist">{ws.slug}</p>
              </div>
              <span className="text-xs text-mist">
                {ROLE_LABEL[ws.role as WorkspaceRole] ?? ws.role}
              </span>
            </Link>
          </li>
        ))}
        {workspaces.length === 0 ? (
          <li className="text-sm text-mist">Todavía no perteneces a ningún workspace.</li>
        ) : null}
      </ul>
      <div className="mt-12">
        <CreateWorkspaceForm />
      </div>
    </main>
  );
}
