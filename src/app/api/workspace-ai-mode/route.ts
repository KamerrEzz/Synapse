import { requireMember } from "@/lib/server/workspace";
import { getUserAiCred, MissingAiKeyError, type AiKeyMode } from "@/lib/ai/user-key";

function parseMode(value: unknown): AiKeyMode | null {
  if (value === "personal" || value === "shared") return value;
  return null;
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { workspaceId?: string; mode?: string };
  if (!body.workspaceId) {
    return Response.json({ error: "Falta workspaceId" }, { status: 400 });
  }
  const mode = parseMode(body.mode);
  if (!mode) {
    return Response.json({ error: "Modo inválido" }, { status: 400 });
  }

  const ctx = await requireMember(body.workspaceId);
  if (ctx.error || !ctx.user) {
    return Response.json({ error: ctx.error }, { status: ctx.status });
  }
  if (ctx.role !== "owner") {
    return Response.json({ error: "Solo el propietario puede cambiar cómo se paga la IA." }, { status: 403 });
  }

  if (mode === "shared") {
    try {
      await getUserAiCred(ctx.supabase);
    } catch (err) {
      if (err instanceof MissingAiKeyError) {
        return Response.json(
          { error: "Primero guarda tu clave de IA. Luego puedes compartirla con el equipo." },
          { status: 409 },
        );
      }
      throw err;
    }
  }

  const { error } = await ctx.supabase
    .from("workspaces")
    .update({ ai_key_mode: mode, updated_at: new Date().toISOString() })
    .eq("id", body.workspaceId);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ mode });
}
