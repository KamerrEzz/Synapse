"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { LeftSheet } from "@/components/layout/left-sheet";
import { Sidebar } from "@/components/layout/sidebar";
import type { Profile, Workspace, WorkspaceRole } from "@/types/database";

export function WorkspaceShell({
  workspace,
  role,
  profile,
  workspaces,
  children,
}: {
  workspace: Workspace;
  role: WorkspaceRole;
  profile: Profile | null;
  workspaces: Pick<Workspace, "id" | "name" | "slug">[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const nav = (
    <Sidebar
      workspace={workspace}
      role={role}
      profile={profile}
      workspaces={workspaces}
      onNavigate={() => setOpen(false)}
    />
  );

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-ink lg:flex-row">
      <div className="hidden h-full lg:flex">{nav}</div>
      <LeftSheet open={open} onClose={() => setOpen(false)} title="Navegación" closeAt="lg">
        {nav}
      </LeftSheet>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex min-h-12 shrink-0 items-center gap-1 border-b border-line bg-shell px-2 pt-[env(safe-area-inset-top)] lg:hidden">
          <button
            type="button"
            aria-expanded={open}
            aria-label="Abrir menú"
            onClick={() => setOpen(true)}
            className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg text-paper hover:bg-raised"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="min-w-0 truncate font-display text-lg tracking-tight">
            {workspace.name}
          </span>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
