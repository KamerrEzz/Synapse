import {
  ChartColumn,
  FileText,
  FolderOpen,
  House,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Primary navigation for the workspace shell.
 * `href` is relative to `/{workspace.slug}`; an empty string is the home page.
 * The accessible names are pinned by the e2e suite — do not rename.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "", label: "Inicio", icon: House },
  { href: "/documents", label: "Documentos", icon: FileText },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/files", label: "Archivos", icon: FolderOpen },
  { href: "/ai", label: "IA", icon: Sparkles },
  { href: "/search", label: "Buscar", icon: Search },
  { href: "/stats", label: "Estadísticas", icon: ChartColumn },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function isNavActive(pathname: string, slug: string, href: string) {
  const base = `/${slug}`;
  if (href === "") return pathname === base;
  const full = `${base}${href}`;
  return pathname === full || pathname.startsWith(`${full}/`);
}