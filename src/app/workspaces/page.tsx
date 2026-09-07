import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form";
import { Badge } from "@/components/ui/badge";
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
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="mb-12 flex items-center gap-2 sm:mb-16">
        <span className="h-2 w-2 rounded-full bg-spark" aria-hidden />
        <span className="font-display text-xl tracking-tight text-paper">Synapse</span>
      </div>
      <header className="border-b border-line pb-8 sm:pb-10">
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em] text-balance text-paper sm:text-5xl">
          Tus workspaces
        </h1>
        <p className="mt-3 text-base leading-relaxed text-mist">
          Elige uno o crea el primero para el equipo.
        </p>
      </header>
      <ul className="divide-y divide-line border-b border-line">
        {workspaces.map((ws) => (
          <li key={ws.id}>
            <Link
              href={`/${ws.slug}/documents`}
              className="group -mx-4 flex items-baseline justify-between gap-4 px-4 py-5 transition-colors hover:bg-raised/50 sm:py-6"
            >
              <span className="min-w-0">
                <span className="block truncate font-display text-xl font-medium tracking-tight text-paper transition-colors group-hover:text-spark-hover sm:text-2xl">
                  {ws.name}
                </span>
                <span className="mt-0.5 block text-sm text-mist">{ws.slug}</span>
              </span>
              <Badge>{ROLE_LABEL[ws.role as WorkspaceRole] ?? ws.role}</Badge>
            </Link>
          </li>
        ))}
        {workspaces.length === 0 ? (
          <li className="py-5 text-sm text-mist sm:py-6">
            Todavía no perteneces a ningún workspace.
          </li>
        ) : null}
      </ul>
      <div className="mt-12 border-t border-line pt-8 sm:mt-16 sm:pt-10">
        <CreateWorkspaceForm />
      </div>
    </main>
  );
}