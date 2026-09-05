import * as React from "react";
import { cn } from "@/lib/utils";

function Avatar({
  className,
  src,
  alt,
  fallback,
}: {
  className?: string;
  src?: string | null;
  alt?: string;
  fallback: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const show = src && !failed;
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-raised text-xs font-medium text-spark",
        className,
      )}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? ""}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        fallback.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

export { Avatar };
