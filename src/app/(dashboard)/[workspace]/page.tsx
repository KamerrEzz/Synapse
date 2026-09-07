import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight, Search } from "lucide-react";
import { getWorkspaceBySlug } from "@/lib/auth";
import { NewDocumentButton } from "@/components/documents/new-document-button";
import { pageNarrow } from "@/components/layout/page-chrome";
import { Button } from "@/components/ui/button";
import type { DocumentRow } from "@/types/database";

export default async function WorkspaceHome({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const ctx = await getWorkspaceBySlug(slug);

  const [docsRes, msgsRes, aiRes, filesRes, membersRes, channelsRes] =
    await Promise.all([
      ctx.supabase
        .from("documents")
        .select(
          "id, workspace_id, title, plain_text, created_by, is_public, created_at, updated_at"
        )
        .eq("workspace_id", ctx.workspace.id)
        .order("updated_at", { ascending: false }),
      ctx.supabase
        .from("messages")
        .select("id, content, user_id, created_at")
        .eq("workspace_id", ctx.workspace.id)
        .order("created_at", { ascending: false })
        .limit(5),
      ctx.supabase
        .from("ai_conversations")
        .select("id, title, created_at")
        .eq("workspace_id", ctx.workspace.id)
        .order("created_at", { ascending: false })
        .limit(3),
      ctx.supabase
        .from("files")
        .select("id, name, status")
        .eq("workspace_id", ctx.workspace.id)
        .order("created_at", { ascending: false })
        .limit(4),
      ctx.supabase
        .from("workspace_members")
        .select("user_id, role")
        .eq("workspace_id", ctx.workspace.id),
      ctx.supabase
        .from("channels")
        .select("id, name")
        .eq("workspace_id", ctx.workspace.id)
        .order("name"),
    ]);

  const documents = (docsRes.data ?? []) as DocumentRow[];
  const recentMessages = msgsRes.data ?? [];
  const recentAIConvos = aiRes.data ?? [];
  const recentFiles = filesRes.data ?? [];
  const members = membersRes.data ?? [];
  const channels = channelsRes.data ?? [];

  const totalMessages = recentMessages.length;
  const uniqueAuthors = new Set(recentMessages.map((m) => m.user_id)).size;

  const firstName = (ctx.profile?.full_name || "").split(" ")[0];

  return (
    <main className={pageNarrow}>
      {/* ── Greeting ── */}
      <header className="pt-4 sm:pt-8">
        <h1 className="font-display text-5xl font-medium tracking-[-0.03em] text-balance text-paper sm:text-6xl">
          {firstName ? `Buen día, ${firstName}` : "Buen día"}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-mist">
          Esto es lo que pasó en {ctx.workspace.name}.
        </p>
      </header>

      {/* ── Primary action ── */}
      <section className="mt-12 border-t border-line pt-8 sm:mt-16 sm:pt-10">
        <h2 className="font-display text-2xl font-medium tracking-tight text-paper sm:text-3xl">
          ¿Qué vas a crear hoy?
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
          Arranca un documento nuevo o buscá en el workspace.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <NewDocumentButton
            workspaceId={ctx.workspace.id}
            slug={slug}
            className="h-12 px-6 text-base"
          />
          <Button asChild variant="outline" size="lg">
            <Link href={`/${slug}/search`}>
              <Search className="h-4 w-4" />
              Buscar
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Summary ledger ── */}
      <section aria-label="Resumen del workspace" className="mt-12 sm:mt-16">
        <dl className="divide-y divide-line border-b border-line">
          <SummaryLeadRow
            href={`/${slug}/documents`}
            label="Documentos"
            value={String(documents.length)}
            hint="en la wiki"
          />
          <SummaryLeadRow
            href={`/${slug}/chat`}
            label="Chat"
            value={String(totalMessages)}
            hint={
              channels.length
                ? `${channels.length} canales · ${uniqueAuthors} ${uniqueAuthors === 1 ? "autor" : "autores"}`
                : "todavía sin mensajes"
            }
          />
          <SummaryLeadRow
            href={`/${slug}/ai`}
            label="Conversaciones IA"
            value={String(recentAIConvos.length)}
            hint="solo con tus datos"
          />
          <SummaryLeadRow
            href={`/${slug}/files`}
            label="Archivos"
            value={String(recentFiles.length)}
            hint={`${members.length} ${members.length === 1 ? "miembro" : "miembros"}`}
          />
        </dl>
      </section>

      {/* ── Recent documents ── */}
      <section aria-label="Documentos recientes" className="mt-12 sm:mt-16">
        <div className="flex items-end justify-between gap-4 border-t border-line pt-8 sm:pt-10">
          <h2 className="font-display text-2xl font-medium tracking-tight text-paper sm:text-3xl">
            Documentos recientes
          </h2>
          <Link
            href={`/${slug}/documents`}
            className="group flex items-center gap-1 text-sm text-mist transition-colors hover:text-paper"
          >
            Ver todos
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {documents.length === 0 ? (
          <div className="border-b border-line py-8">
            <p className="font-display text-xl font-medium tracking-tight text-paper">
              La wiki está vacía
            </p>
            <p className="mt-1 text-sm leading-relaxed text-mist">
              Creá la primera página para empezar a escribir en equipo.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line border-b border-line">
            {documents.slice(0, 5).map((doc) => (
              <li key={doc.id}>
                <Link
                  href={`/${slug}/documents/${doc.id}`}
                  className="group -mx-4 flex flex-col gap-1 px-4 py-5 transition-colors hover:bg-raised/50 sm:py-6"
                >
                  <span className="flex items-start justify-between gap-4">
                    <span className="min-w-0 font-display text-xl font-medium tracking-tight text-paper transition-colors group-hover:text-spark-hover sm:text-2xl">
                      {doc.title || "Sin título"}
                    </span>
                    <span className="shrink-0 pt-1.5 text-xs text-mist">
                      {formatDistanceToNow(new Date(doc.updated_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </span>
                  <span className="line-clamp-2 max-w-2xl text-sm leading-relaxed text-mist">
                    {doc.plain_text || "Vacío"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── IA ── */}
      <section aria-label="IA" className="mt-12 sm:mt-16">
        <div className="flex items-end justify-between gap-4 border-t border-line pt-8 sm:pt-10">
          <h2 className="font-display text-2xl font-medium tracking-tight text-paper sm:text-3xl">
            IA
          </h2>
          <Link
            href={`/${slug}/ai`}
            className="group flex items-center gap-1 text-sm text-mist transition-colors hover:text-paper"
          >
            Preguntar
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        {recentAIConvos.length === 0 ? (
          <div className="border-b border-line py-8">
            <p className="text-sm leading-relaxed text-mist">
              Todavía no hubo preguntas. Subí documentos y preguntale a la IA
              sobre ellos.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line border-b border-line">
            {recentAIConvos.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/${slug}/ai/${c.id}`}
                  className="group -mx-4 flex items-baseline justify-between gap-4 px-4 py-4 transition-colors hover:bg-raised/50 sm:py-5"
                >
                  <span className="min-w-0 truncate text-base text-paper transition-colors group-hover:text-spark-hover">
                    {c.title || "Conversación"}
                  </span>
                  <span className="shrink-0 text-xs text-mist">
                    {formatDistanceToNow(new Date(c.created_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Movimiento reciente ── */}
      <section aria-label="Movimiento reciente" className="mt-12 sm:mt-16">
        <div className="flex items-end justify-between gap-4 border-t border-line pt-8 sm:pt-10">
          <h2 className="font-display text-2xl font-medium tracking-tight text-paper sm:text-3xl">
            Movimiento reciente
          </h2>
          <Link
            href={`/${slug}/chat`}
            className="group flex items-center gap-1 text-sm text-mist transition-colors hover:text-paper"
          >
            Ir al chat
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        {recentMessages.length === 0 ? (
          <div className="border-b border-line py-8">
            <p className="text-sm leading-relaxed text-mist">
              Sin movimiento todavía. El chat en vivo arranca con el primer
              mensaje.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line border-b border-line">
            {recentMessages.map((m) => (
              <li key={m.id} className="flex items-baseline gap-3 py-4 sm:py-5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-spark" aria-hidden />
                <p className="min-w-0 line-clamp-2 text-sm leading-snug text-mist">
                  {m.content}
                  <span className="block pt-0.5 text-xs text-mist/70">
                    {formatDistanceToNow(new Date(m.created_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function SummaryLeadRow({
  href,
  label,
  value,
  hint,
}: {
  href: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div>
      <Link
        href={href}
        className="group -mx-4 flex items-center justify-between gap-4 px-4 py-5 transition-colors hover:bg-raised/50 sm:py-6"
      >
        <span className="min-w-0">
          <span className="block text-sm text-paper">{label}</span>
          <span className="mt-0.5 block text-xs text-mist">{hint}</span>
        </span>
        <span className="shrink-0 font-display text-3xl font-medium tracking-tight tabular-nums text-paper sm:text-4xl">
          {value}
        </span>
      </Link>
    </div>
  );
}