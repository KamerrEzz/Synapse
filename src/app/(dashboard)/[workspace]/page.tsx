import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  FileText,
  MessageSquare,
  Sparkles,
  FolderOpen,
  ArrowRight,
  Search,
} from "lucide-react";
import { getWorkspaceBySlug } from "@/lib/auth";
import { NewDocumentButton } from "@/components/documents/new-document-button";
import { pageWide } from "@/components/layout/page-chrome";
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
    <main className={pageWide}>
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-spark">
            {ctx.workspace.name}
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-tight text-paper">
            {firstName ? `Buen día, ${firstName}` : "Buen día"}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
            Esto es lo que pasó en tu workspace.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/${slug}/search`}>
              <Search className="h-3.5 w-3.5" />
              Buscar
            </Link>
          </Button>
          <NewDocumentButton workspaceId={ctx.workspace.id} slug={slug} />
        </div>
      </div>

      {/* ── Summary cards ── */}
      <section
        aria-label="Resumen del workspace"
        className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <SummaryCard
          href={`/${slug}/documents`}
          icon={FileText}
          tint="text-spark bg-spark/10"
          label="Documentos"
          value={String(documents.length)}
          hint="en la wiki"
        />
        <SummaryCard
          href={`/${slug}/chat`}
          icon={MessageSquare}
          tint="text-mist bg-raised"
          label="Chat"
          value={String(totalMessages)}
          hint={
            channels.length
              ? `${channels.length} canales · ${uniqueAuthors} ${uniqueAuthors === 1 ? "autor" : "autores"}`
              : "todavía sin mensajes"
          }
        />
        <SummaryCard
          href={`/${slug}/ai`}
          icon={Sparkles}
          tint="text-spark bg-spark/10"
          label="Conversaciones IA"
          value={String(recentAIConvos.length)}
          hint="solo con tus datos"
        />
        <SummaryCard
          href={`/${slug}/files`}
          icon={FolderOpen}
          tint="text-mist bg-raised"
          label="Archivos"
          value={String(recentFiles.length)}
          hint={`${members.length} ${members.length === 1 ? "miembro" : "miembros"}`}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* ── Recent documents ── */}
        <section className="rounded-2xl border border-line bg-shell p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl tracking-tight">Documentos recientes</h2>
            <Link
              href={`/${slug}/documents`}
              className="group flex items-center gap-1 text-xs text-mist transition-colors hover:text-paper"
            >
              Ver todos
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {documents.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-line px-6 py-10 text-center">
              <FileText className="mx-auto h-6 w-6 text-mist" />
              <p className="mt-3 text-sm text-paper">La wiki está vacía</p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-mist">
                Creá la primera página para empezar a escribir en equipo.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {documents.slice(0, 5).map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/${slug}/documents/${doc.id}`}
                    className="group flex items-center gap-3 py-3"
                  >
                    <span className="inline-block h-8 w-1 shrink-0 rounded-full bg-spark/60 transition-colors group-hover:bg-spark" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-paper transition-colors group-hover:text-spark-hover">
                        {doc.title || "Sin título"}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-mist">
                        {doc.plain_text || "Vacío"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-mist">
                      {formatDistanceToNow(new Date(doc.updated_at), {
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

        {/* ── Right column: IA + activity ── */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-shell p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl tracking-tight">IA</h2>
              <Link
                href={`/${slug}/ai`}
                className="group flex items-center gap-1 text-xs text-mist transition-colors hover:text-paper"
              >
                Preguntar
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            {recentAIConvos.length === 0 ? (
              <p className="mt-4 text-sm leading-relaxed text-mist">
                Todavía no hubo preguntas. Subí documentos y preguntale a la IA
                sobre ellos.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {recentAIConvos.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/${slug}/ai/${c.id}`}
                      className="block rounded-lg border border-line bg-raised/40 px-3 py-2.5 transition-colors hover:border-spark/40 hover:bg-raised"
                    >
                      <p className="truncate text-sm text-paper">
                        {c.title || "Conversación"}
                      </p>
                      <p className="mt-0.5 text-xs text-mist">
                        {formatDistanceToNow(new Date(c.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-shell p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl tracking-tight">
                Movimiento reciente
              </h2>
              <Link
                href={`/${slug}/chat`}
                className="group flex items-center gap-1 text-xs text-mist transition-colors hover:text-paper"
              >
                Ir al chat
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            {recentMessages.length === 0 ? (
              <p className="mt-4 text-sm leading-relaxed text-mist">
                Sin movimiento todavía. El chat en vivo arranca con el primer
                mensaje.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {recentMessages.map((m) => (
                  <li key={m.id} className="flex gap-3">
                    <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-spark" />
                    <p className="min-w-0 line-clamp-2 text-sm leading-snug text-mist">
                      {m.content}
                      <span className="block text-xs text-mist/60">
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
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  href,
  icon: Icon,
  tint,
  label,
  value,
  hint,
}: {
  href: string;
  icon: typeof FileText;
  tint: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-line bg-shell p-4 transition-colors hover:border-spark/40 hover:bg-raised/60"
    >
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${tint}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 font-display text-2xl tracking-tight text-paper">
        {value}
      </p>
      <p className="text-sm text-paper">{label}</p>
      <p className="mt-0.5 text-xs text-mist">{hint}</p>
    </Link>
  );
}