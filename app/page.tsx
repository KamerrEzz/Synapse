import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink px-6 py-10 text-paper">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(212,160,84,0.18), transparent 32%), radial-gradient(circle at 88% 0%, rgba(107,158,138,0.12), transparent 28%)",
        }}
      />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between">
        <span className="font-display text-2xl tracking-tight">Synapse</span>
        <Button asChild variant="ghost">
          <Link href="/login">Entrar</Link>
        </Button>
      </header>
      <section className="relative mx-auto mt-24 max-w-3xl">
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight text-paper sm:text-7xl">
          El conocimiento de tu equipo, conectado.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-mist">
          Documentos en vivo, chat del workspace y una IA que responde solo con
          lo que ustedes escribieron. Sin mezclar datos de otro equipo.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/login">Crear workspace</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Ya tengo cuenta</Link>
          </Button>
        </div>
      </section>
      <section className="relative mx-auto mt-24 grid max-w-6xl gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
        {[
          {
            title: "Documentos",
            body: "Varias personas escriben el mismo texto a la vez. El estado vive en tu workspace.",
          },
          {
            title: "Chat",
            body: "Canales por equipo, en tiempo real, junto a la wiki. No hace falta otra app.",
          },
          {
            title: "IA grounded",
            body: "Pregunta sobre PDFs y páginas internas. Si no está en el workspace, lo dice.",
          },
        ].map((item) => (
          <article key={item.title} className="bg-shell p-8">
            <h2 className="font-display text-2xl text-spark">{item.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-mist">{item.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
