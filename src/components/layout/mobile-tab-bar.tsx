"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavActive, NAV_ITEMS } from "@/components/layout/nav-items";

const PRIMARY = NAV_ITEMS.slice(0, 4); // Inicio, Documentos, Chat, Archivos

export function MobileTabBar({
  slug,
  onOpenNav,
}: {
  slug: string;
  onOpenNav: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-shell pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {PRIMARY.map((item) => {
          const href = `/${slug}${item.href}`;
          const active = isNavActive(pathname, slug, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 pt-2.5 pb-2 text-[10px] transition-colors",
                  active ? "text-spark" : "text-mist hover:text-paper",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onOpenNav}
            className="flex w-full flex-col items-center gap-1 pt-2.5 pb-2 text-[10px] text-mist transition-colors hover:text-paper"
          >
            <Menu className="h-5 w-5" />
            Más
          </button>
        </li>
      </ul>
    </nav>
  );
}