import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AiKeyMode } from "@/lib/ai/user-key";

export function AiKeyGate({
  slug,
  mode = "personal",
  isOwner = false,
}: {
  slug: string;
  mode?: AiKeyMode;
  isOwner?: boolean;
}) {
  const copy =
    mode === "shared"
      ? isOwner
        ? "Este workspace comparte tu clave, pero todavía no hay ninguna guardada. Configúrala en Ajustes."
        : "El propietario comparte la clave de este workspace, pero aún no la ha configurado."
      : "Cada persona puede usar su propia clave, o el propietario puede compartir la suya en Ajustes. Sin una de las dos no hay chat, búsqueda semántica ni indexado.";

  return (
    <div className="flex h-full min-h-[28rem] items-center justify-center px-4 sm:px-8">
      <div className="max-w-md text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-shell text-spark">
          <Sparkles className="h-5 w-5" />
        </span>
        <h1 className="mt-5 font-display text-3xl text-paper">IA del workspace</h1>
        <p className="mt-3 text-sm leading-relaxed text-mist">{copy}</p>
        <Button asChild className="mt-6">
          <Link href={`/${slug}/settings`}>Ir a Ajustes</Link>
        </Button>
      </div>
    </div>
  );
}
