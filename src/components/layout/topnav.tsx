"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ROLE_LABEL } from "@/lib/labels";
import { isNavActive, NAV_ITEMS } from "@/components/layout/nav-items";
import type { Profile, Workspace, WorkspaceRole } from "@/types/database";

export function TopNav({
  workspace,
  role,
  profile,
  workspaces,
  onOpenNav,
}: {
  workspace: Workspace;
  role: WorkspaceRole;
  profile: Profile | null;
  workspaces: Pick<Workspace, "id" | "name" | "slug">[];
  onOpenNav: () => void;
}) {
  const pathname = usePathname();
  const initials = (profile?.full_name || profile?.id || "?").slice(0, 2);
  const slug = workspace.slug;

  return (
    <header className="z-40 shrink-0 border-b border-line bg-shell">
      {/* Row 1 — identity, workspace, session */}
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-2 px-4 sm:px-8 lg:h-16">
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={onOpenNav}
          className="inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-paper hover:bg-raised lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/workspaces" className="flex shrink-0 items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-spark" aria-hidden />
          <span className="font-display text-xl tracking-tight text-paper">Synapse</span>
        </Link>
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden />
        <label className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none">
          <span className="hidden text-[11px] uppercase tracking-wide text-mist xl:block">
            Workspace
          </span>
          <select
            className="h-9 w-full min-w-0 cursor-pointer truncate rounded-lg border border-line bg-raised px-2.5 text-sm text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spark/70 lg:w-auto lg:max-w-48"
            value={workspace.slug}
            onChange={(e) => {
              window.location.href = `/${e.target.value}/documents`;
            }}
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.slug} className="bg-shell">
                {ws.name}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2.5">
            <Avatar src={profile?.avatar_url} fallback={initials} />
            <div className="hidden min-w-0 xl:block">
              <p className="truncate text-xs text-paper">
                {profile?.full_name || "Tu perfil"}
              </p>
              <p className="text-[11px] text-mist">{ROLE_LABEL[role]}</p>
            </div>
          </div>
          <div className="hidden w-28 lg:block">
            <SignOutButton />
          </div>
        </div>
      </div>
      {/* Row 2 — section index */}
      <nav
        aria-label="Principal"
        className="hidden border-t border-line lg:block"
      >
        <div className="mx-auto flex max-w-4xl items-stretch px-8">
          {NAV_ITEMS.map((item) => {
            const href = `/${slug}${item.href}`;
            const active = isNavActive(pathname, slug, item.href);
            return (
              <Link
                key={item.href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center px-3 text-sm transition-colors",
                  active
                    ? "text-paper after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-spark after:content-['']"
                    : "text-mist hover:text-paper",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}