import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function Badge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-line px-2 py-0.5 text-[11px] text-mist",
        className,
      )}
    >
      {children}
    </span>
  );
}

export { Badge };
