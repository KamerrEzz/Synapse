"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  MessageSquare,
  FolderOpen,
  Sparkles,
  Settings,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ROLE_LABEL } from "@/lib/labels";
import type { Profile, Workspace, WorkspaceRole } from "@/types/database";

const NAV = [
  { href: "documents", label: "Documentos", icon: FileText },
  { href: "chat", label: "Chat", icon: MessageSquare },
  { href: "files", label: "Archivos", icon: FolderOpen },
  { href: "ai", label: "IA", icon: Sparkles },
  { href: "search", label: "Buscar", icon: Search },
  { href: "settings", label: "Ajustes", icon: Settings },
];

export function Sidebar({
  workspace,
  role,
  profile,
  workspaces,
}: {
  workspace: Workspace;
  role: WorkspaceRole;
  profile: Profile | null;
  workspaces: Pick<Workspace, "id" | "name" | "slug">[];
}) {
  const pathname = usePathname();
  const initials = (profile?.full_name || profile?.id || "?").slice(0, 2);

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col border-r border-line bg-shell">
      <div className="px-3 py-5">
        <Link href="/workspaces" className="flex items-center gap-2 px-1">
          <span className="h-2 w-2 rounded-full bg-spark" aria-hidden />
          <span className="font-display text-xl tracking-tight">Synapse</span>
        </Link>
        <label className="mt-5 block px-1">
          <span className="text-[11px] text-mist">Workspace</span>
          <select
            className="mt-1.5 h-10 w-full cursor-pointer rounded-lg border border-line bg-raised px-2.5 text-sm text-paper"
            value={workspace.slug}
            onChange={(e) => {
              window.location.href = `/${e.target.value}/documents`;
            }}
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.slug}>
                {ws.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {NAV.map((item) => {
          const href = `/${workspace.slug}/${item.href}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm",
                active
                  ? "bg-raised text-paper shadow-[inset_2px_0_0_0_var(--spark)]"
                  : "text-mist hover:bg-raised/70 hover:text-paper",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-spark" : "")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-line px-3 py-4">
        <div className="flex items-center gap-3 px-1">
          <Avatar src={profile?.avatar_url} fallback={initials} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-paper">{profile?.full_name || "Tu perfil"}</p>
            <p className="text-[11px] text-mist">{ROLE_LABEL[role]}</p>
          </div>
        </div>
        <div className="mt-3">
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
