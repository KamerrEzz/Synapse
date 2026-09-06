import Link from "next/link";
import type { WorkspaceAiAccess } from "@/lib/ai/user-key";

export function WorkspaceAiBanner({
  slug,
  access,
  personalCopy,
}: {
  slug: string;
  access: WorkspaceAiAccess;
  personalCopy: string;
}) {
  if (access.configured) return null;
  const text =
    access.mode === "shared"
      ? "El propietario comparte la clave de IA, pero todavía no hay ninguna configurada."
      : personalCopy;
  return (
    <p className="mt-6 rounded-xl border border-spark/40 bg-spark/10 px-4 py-3 text-sm text-paper">
      {text}{" "}
      <Link href={`/${slug}/settings`} className="text-spark hover:underline">
        Ajustes
      </Link>
    </p>
  );
}
