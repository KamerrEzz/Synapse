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
    <div className="mt-8 rounded-2xl border border-dashed border-line bg-shell/70 px-8 py-14 text-center">
      <p className="font-display text-xl text-paper">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-mist">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
