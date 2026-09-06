import dynamic from "next/dynamic";
import { PageHeader, pageWide } from "@/components/layout/page-chrome";
import { getWorkspaceBySlug } from "@/lib/auth";
import { collectWorkspaceStats, parseRangeDays } from "@/lib/stats/collect";

const StatsDashboard = dynamic(
  () => import("@/components/stats/stats-dashboard").then((m) => m.StatsDashboard),
  {
    loading: () => <p className="mt-8 text-sm text-mist">Cargando gráficos…</p>,
  },
);

export default async function StatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ dias?: string }>;
}) {
  const { workspace: slug } = await params;
  const { dias } = await searchParams;
  const ctx = await getWorkspaceBySlug(slug);
  const days = parseRangeDays(dias);
  let snap;
  try {
    snap = await collectWorkspaceStats(ctx.supabase, ctx.workspace, days);
  } catch (err) {
    return (
      <main className={pageWide}>
        <PageHeader
          title="Estadísticas"
          description="No se pudo armar el snapshot de este workspace."
        />
        <p className="mt-8 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-paper">
          {err instanceof Error ? err.message : "Error al leer estadísticas"}
        </p>
      </main>
    );
  }

  return (
    <main className={pageWide}>
      <PageHeader
        title="Estadísticas"
        description={`${ctx.workspace.name} · últimos ${days} días. Costes estimados con tu modelo BYOK; Synapse no factura IA.`}
      />
      <div className="mt-8">
        <StatsDashboard snap={snap} slug={slug} />
      </div>
    </main>
  );
}
