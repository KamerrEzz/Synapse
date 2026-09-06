"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const CLOSE_AT = {
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
} as const;

export function LeftSheet({
  open,
  onClose,
  title,
  closeAt,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeAt?: keyof typeof CLOSE_AT;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const mq = closeAt ? window.matchMedia(CLOSE_AT[closeAt]) : null;
    const onMq = () => {
      if (mq?.matches) onClose();
    };
    mq?.addEventListener("change", onMq);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      mq?.removeEventListener("change", onMq);
    };
  }, [open, onClose, closeAt]);

  if (!open) return null;

  return (
    <div className={cn("fixed inset-0 z-50", closeAt === "lg" && "lg:hidden", closeAt === "md" && "md:hidden")}>
      <button
        type="button"
        className="absolute inset-0 bg-ink/75"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex h-full w-[min(16.5rem,86vw)] flex-col border-r border-line bg-shell pt-[env(safe-area-inset-top)] shadow-[8px_0_32px_rgba(0,0,0,0.35)]"
      >
        {children}
      </div>
    </div>
  );
}
