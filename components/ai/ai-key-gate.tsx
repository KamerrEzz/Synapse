import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AiKeyGate({ slug }: { slug: string }) {
  return (
    <div className="flex h-full min-h-[28rem] items-center justify-center px-4 sm:px-8">
      <div className="max-w-md text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-shell text-spark">
          <Sparkles className="h-5 w-5" />
        </span>
        <h1 className="mt-5 font-display text-3xl text-paper">IA del workspace</h1>
        <p className="mt-3 text-sm leading-relaxed text-mist">
          Cada persona usa su propia clave de un proveedor compatible con OpenAI. Añádela en
          Ajustes: se cifra en el servidor y no vuelve a mostrarse. Sin ella no hay chat,
          búsqueda semántica ni indexado.
        </p>
        <Button asChild className="mt-6">
          <Link href={`/${slug}/settings`}>Ir a Ajustes</Link>
        </Button>
      </div>
    </div>
  );
}
