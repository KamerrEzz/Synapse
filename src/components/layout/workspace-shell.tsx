"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ROLE_LABEL } from "@/lib/labels";
import { LeftSheet } from "@/components/layout/left-sheet";
import { TopNav } from "@/components/layout/topnav";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { isNavActive, NAV_ITEMS } from "@/components/layout/nav-items";
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
  const [prevPathname, setPrevPathname] = useState(pathname);
  const initials = (profile?.full_name || profile?.id || "?").slice(0, 2);

  // Close the sheet when navigation lands (browser back/forward included).
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const sheetNav = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-4">
        <span className="h-2 w-2 rounded-full bg-spark" aria-hidden />
        <span className="min-w-0 truncate font-display text-lg tracking-tight text-paper">
          {workspace.name}
        </span>
      </div>
      <nav aria-label="Navegación" className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => {
          const href = `/${workspace.slug}${item.href}`;
          const active = isNavActive(pathname, workspace.slug, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                "flex h-11 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors",
                active
                  ? "bg-raised text-paper"
                  : "text-mist hover:bg-raised/70 hover:text-paper",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-spark" : "")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3 px-1">
          <Avatar src={profile?.avatar_url} fallback={initials} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-paper">
              {profile?.full_name || "Tu perfil"}
            </p>
            <p className="text-[11px] text-mist">{ROLE_LABEL[role]}</p>
          </div>
        </div>
        <div className="mt-3">
          <SignOutButton />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-ink">
      <TopNav
        workspace={workspace}
        role={role}
        profile={profile}
        workspaces={workspaces}
        onOpenNav={() => setOpen(true)}
      />
      <div className="min-h-0 flex-1 overflow-y-auto pb-14 lg:pb-0">{children}</div>
      <MobileTabBar slug={workspace.slug} onOpenNav={() => setOpen(true)} />
      <LeftSheet open={open} onClose={() => setOpen(false)} title="Navegación" closeAt="lg">
        {sheetNav}
      </LeftSheet>
    </div>
  );
}