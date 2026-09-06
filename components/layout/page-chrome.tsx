import type { ReactNode } from "react";

export const pageWide = "mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8";
export const pageNarrow = "mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 sm:py-8";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl tracking-tight text-paper sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-xl text-sm leading-relaxed text-mist">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-shell p-4 sm:p-6 ${className}`}>{children}</section>
  );
}
