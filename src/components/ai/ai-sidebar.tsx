import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AiConversation } from "@/types/database";

export function AiSidebar({
  slug,
  conversations,
  activeId,
}: {
  slug: string;
  conversations: AiConversation[];
  activeId: string | null;
}) {
  return (
    <>
      <div className="border-b border-line px-4 py-4">
        <Link
          href={`/${slug}/ai`}
          className="inline-flex h-11 items-center rounded-lg bg-spark px-3 text-sm font-medium text-ink hover:bg-spark-hover md:h-9"
        >
          Nueva pregunta
        </Link>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <li className="px-2 py-3 text-xs text-mist">Todavía no hay conversaciones.</li>
        ) : (
          conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${slug}/ai/${c.id}`}
                className={cn(
                  "block truncate rounded-lg px-3 py-2.5 text-sm md:py-2",
                  c.id === activeId
                    ? "bg-raised text-paper"
                    : "text-mist hover:bg-raised/70 hover:text-paper",
                )}
              >
                {c.title || "Conversación"}
              </Link>
            </li>
          ))
        )}
      </ul>
    </>
  );
}
