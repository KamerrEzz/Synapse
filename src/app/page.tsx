import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  FileText,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Users,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="relative min-h-dvh overflow-x-clip bg-ink text-paper">
      {/* ── Ambient glow ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 60% 40% at 15% 10%, rgba(212,160,84,0.08), transparent 70%)",
            "radial-gradient(ellipse 50% 50% at 85% 5%, rgba(107,158,138,0.05), transparent 60%)",
          ].join(", "),
        }}
      />

      {/* ── Nav ── */}
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-spark" />
          <span className="font-display text-xl tracking-tight">Synapse</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">Empezar</Link>
          </Button>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="relative mx-auto max-w-6xl px-6 pt-16 sm:px-8 sm:pt-28 lg:pt-36">
        <div className="max-w-3xl">
          <h1 className="font-display text-[2.5rem] leading-[1.06] tracking-tight sm:text-6xl lg:text-7xl lg:leading-[1.04]">
            El conocimiento
            <br />
            de tu equipo,{" "}
            <span className="text-spark">conectado.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-mist sm:mt-8 sm:text-lg">
            Documentos en vivo, chat del workspace y una IA que responde solo
            con lo que ustedes escribieron. Sin mezclar datos de otro equipo.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="group w-full sm:w-auto">
              <Link href="/login">
                Crear workspace gratis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Link href="/login">Ya tengo cuenta</Link>
            </Button>
          </div>
        </div>

        {/* ── Hero visual: product glimpse ── */}
        <div className="mt-16 sm:mt-24">
          <div className="relative overflow-hidden rounded-xl border border-line bg-shell sm:rounded-2xl">
            {/* Chrome bar */}
            <div className="flex items-center gap-2 border-b border-line bg-raised/60 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
              <span className="ml-3 text-xs text-mist">synapse.app/mi-equipo</span>
            </div>
            {/* Fake dashboard content */}
            <div className="grid min-h-[320px] sm:min-h-[420px] lg:grid-cols-[220px_1fr]">
              {/* Sidebar */}
              <div className="hidden border-r border-line bg-shell p-4 lg:block">
                <div className="mb-6 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-spark" />
                  <span className="font-display text-sm tracking-tight">
                    Synapse
                  </span>
                </div>
                <div className="space-y-1">
                  {["Documentos", "Chat", "Archivos", "IA", "Buscar"].map(
                    (item, i) => (
                      <div
                        key={item}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                          i === 0
                            ? "bg-raised text-paper shadow-[inset_2px_0_0_0_var(--spark)]"
                            : "text-mist"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded ${
                            i === 0 ? "bg-spark/30" : "bg-line"
                          }`}
                        />
                        {item}
                      </div>
                    )
                  )}
                </div>
              </div>
              {/* Main content */}
              <div className="p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-lg tracking-tight">
                    Documentos
                  </h2>
                  <span className="rounded-md bg-spark/10 px-2.5 py-1 text-xs text-spark">
                    12 documentos
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    {
                      title: "Guía de onboarding",
                      updated: "hace 2h",
                      edit: true,
                    },
                    {
                      title: "RFC: Nuevo motor de búsqueda",
                      updated: "hace 5h",
                      edit: false,
                    },
                    {
                      title: "Notas de la reunión — Sprint 14",
                      updated: "ayer",
                      edit: false,
                    },
                    {
                      title: "API Reference v2",
                      updated: "hace 3 días",
                      edit: true,
                    },
                  ].map((doc) => (
                    <div
                      key={doc.title}
                      className="flex items-center gap-3 rounded-lg border border-line bg-raised/40 px-3.5 py-2.5 sm:px-4"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-mist" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-paper">
                          {doc.title}
                        </p>
                        <p className="text-xs text-mist">{doc.updated}</p>
                      </div>
                      {doc.edit && (
                        <span className="flex items-center gap-1 text-[10px] text-ok">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-ok" />
                          editando
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Subtle reflection */}
          <div
            aria-hidden
            className="mx-auto mt-1 h-px w-3/4 bg-gradient-to-r from-transparent via-line to-transparent"
          />
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative mx-auto mt-24 max-w-6xl px-6 sm:mt-32 sm:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            Todo lo que tu equipo necesita,
            <br />
            <span className="text-mist">nada que no necesite.</span>
          </h2>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:mt-16 sm:grid-cols-3">
          {[
            {
              icon: FileText,
              title: "Documentos colaborativos",
              body: "Varias personas escriben el mismo texto a la vez. El estado vive en tu workspace, no en la nube de otro.",
            },
            {
              icon: MessageSquare,
              title: "Chat en tiempo real",
              body: "Canales por equipo, presencia, mensajes al instante. No hace falta Slack encima.",
            },
            {
              icon: Sparkles,
              title: "IA grounded en tus datos",
              body: "Pregunta sobre PDFs y páginas internas. Si no está en el workspace, lo dice. Sin inventar.",
            },
          ].map((feature) => (
            <article
              key={feature.title}
              className="bg-shell p-6 sm:p-8"
            >
              <feature.icon className="h-5 w-5 text-spark" />
              <h3 className="mt-4 font-display text-lg tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-mist">
                {feature.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Values strip ── */}
      <section className="relative mx-auto mt-24 max-w-6xl px-6 sm:mt-32 sm:px-8">
        <div className="grid gap-8 sm:grid-cols-3 sm:gap-12">
          {[
            {
              icon: Shield,
              title: "RLS real",
              body: "Multi-tenancy de verdad. Nadie ve datos de un workspace al que no pertenece.",
            },
            {
              icon: Zap,
              title: "Rápido por naturaleza",
              body: "Supabase Realtime, edge functions, pgvector. Sin fricción, sin colas.",
            },
            {
              icon: Users,
              title: "Para equipos de 5–50",
              body: "Reemplaza Notion + Slack + Drive + ChatGPT interno con una sola herramienta.",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-4">
              <item.icon className="h-5 w-5 shrink-0 text-spark" />
              <div>
                <h3 className="font-display text-base tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-mist">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative mx-auto mt-24 max-w-6xl px-6 sm:mt-32 sm:px-8">
        <div className="overflow-hidden rounded-xl border border-line bg-shell px-6 py-14 text-center sm:px-12 sm:py-20">
          <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
            Un workspace. Un equipo. Una mente.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-mist">
            Creá tu workspace en un minuto. Sin tarjeta, sin compromiso. Después
            decidís si te queda chico.
          </p>
          <Button asChild size="lg" className="mt-8 group">
            <Link href="/login">
              Empezar ahora
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative mx-auto mt-24 max-w-6xl border-t border-line px-6 pb-10 pt-8 sm:mt-32 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-spark" />
            <span className="font-display text-sm tracking-tight">
              Synapse
            </span>
          </div>
          <p className="text-xs text-mist">
            &copy; {new Date().getFullYear()} Synapse. Knowledge base
            colaborativa.
          </p>
        </div>
      </footer>
    </main>
  );
}
