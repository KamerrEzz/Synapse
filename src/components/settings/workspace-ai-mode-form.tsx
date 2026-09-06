"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AiKeyMode } from "@/lib/ai/user-key";

const OPTIONS: { id: AiKeyMode; title: string; body: string }[] = [
  {
    id: "personal",
    title: "Cada quien la suya",
    body: "Cada miembro indexa y pregunta con su propia clave. Si no la tiene, esas funciones no le funcionan.",
  },
  {
    id: "shared",
    title: "Compartir la mía",
    body: "El equipo usa tu clave en el servidor. Nadie la ve. El uso sale de tu proveedor (límites por persona, más adelante).",
  },
];

export function WorkspaceAiModeForm({
  workspaceId,
  canManage,
  initialMode,
  personalConfigured,
}: {
  workspaceId: string;
  canManage: boolean;
  initialMode: AiKeyMode;
  personalConfigured: boolean;
}) {
  const [mode, setMode] = useState<AiKeyMode>(initialMode);
  const [busy, setBusy] = useState(false);

  async function choose(next: AiKeyMode) {
    if (!canManage || next === mode || busy) return;
    if (next === "shared" && !personalConfigured) {
      toast.error("Guarda tu clave abajo y luego actívala para el equipo.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/workspace-ai-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, mode: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "No se pudo guardar");
      setMode(next);
      toast.success(next === "shared" ? "El equipo usará tu clave" : "Cada miembro usará la suya");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  if (!canManage) {
    return (
      <p className="text-sm leading-relaxed text-mist">
        {mode === "shared"
          ? "Este workspace usa la clave del propietario. No hace falta que pongas la tuya aquí, salvo que quieras usarla en otro workspace."
          : "Este workspace pide una clave a cada miembro. La tuya se configura más abajo."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-mist">
        Tú decides si el equipo gasta tu proveedor o el de cada persona. La clave nunca se
        enseña a los invitados.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const selected = mode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={busy}
              onClick={() => void choose(opt.id)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left transition-colors",
                selected
                  ? "border-spark bg-spark/10 text-paper"
                  : "border-line bg-raised/40 text-mist hover:border-spark/50 hover:text-paper",
              )}
            >
              <span className="block text-sm font-medium text-paper">{opt.title}</span>
              <span className="mt-1 block text-xs leading-relaxed">{opt.body}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
