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
    <div className="border-t border-line pt-10 sm:pt-14">
      <p className="font-display text-2xl font-medium tracking-tight text-paper sm:text-3xl">
        {title}
      </p>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-mist">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}