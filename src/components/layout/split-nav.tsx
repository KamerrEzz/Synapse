"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { LeftSheet } from "@/components/layout/left-sheet";

export function SplitNav({
  panelTitle,
  currentTitle,
  panel,
  trailing,
  children,
}: {
  panelTitle: string;
  currentTitle?: string;
  panel: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-line bg-shell md:flex">
        {panel}
      </aside>
      <LeftSheet open={open} onClose={() => setOpen(false)} title={panelTitle} closeAt="md">
        {panel}
      </LeftSheet>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-line bg-shell px-3 py-1.5 md:hidden">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="inline-flex h-11 min-w-11 touch-manipulation items-center gap-2 rounded-lg px-2 text-sm text-paper hover:bg-raised"
          >
            <PanelLeft className="h-4 w-4 text-spark" />
            <span>{panelTitle}</span>
          </button>
          {currentTitle ? (
            <p className="min-w-0 flex-1 truncate text-sm text-mist">{currentTitle}</p>
          ) : null}
          {trailing ? <div className="ml-auto shrink-0">{trailing}</div> : null}
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
