import type { ReactNode } from "react";

export const pageWide = "mx-auto w-full max-w-4xl px-5 pb-14 pt-10 sm:px-8 sm:pt-14 lg:pb-20";
export const pageNarrow = "mx-auto w-full max-w-3xl px-5 pb-14 pt-10 sm:px-8 sm:pt-14 lg:pb-20";

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
    <header className="border-b border-line pb-8 sm:pb-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-medium tracking-[-0.02em] text-balance text-paper sm:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-mist">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`border-t border-line pt-8 sm:pt-10 ${className}`}>{children}</section>;
}