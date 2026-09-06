import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-line bg-shell/70 px-4 py-10 text-center sm:px-8 sm:py-14">
      <p className="font-display text-xl text-paper">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-mist">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
