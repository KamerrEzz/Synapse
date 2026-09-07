import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm text-paper placeholder:text-mist/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spark/70",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
