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
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-line bg-shell">
      <div className="px-4 py-5">
        <Link href="/workspaces" className="font-display text-xl tracking-tight">
          Synapse
        </Link>
        <label className="mt-4 block">
          <span className="sr-only">Workspace</span>
          <select
            className="mt-1 h-10 w-full cursor-pointer rounded-md border border-line bg-raised px-2 text-sm text-paper"
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
      <nav className="flex flex-1 flex-col gap-1 px-2">
        {NAV.map((item) => {
          const href = `/${workspace.slug}/${item.href}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex h-10 items-center gap-2 rounded-md px-3 text-sm",
                active
                  ? "bg-raised text-spark"
                  : "text-mist hover:bg-raised hover:text-paper",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex items-center gap-3 border-t border-line px-4 py-4">
        <Avatar src={profile?.avatar_url} fallback={initials} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{profile?.full_name || "Tu perfil"}</p>
          <p className="text-[11px] text-mist">{role}</p>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
