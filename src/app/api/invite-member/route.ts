import { NextResponse } from "next/server";
import { requireMember } from "@/lib/server/workspace";
import { FREE_PLAN } from "@/lib/plans";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    workspaceId?: string;
    email?: string;
    role?: "admin" | "member";
  };
  if (!body.workspaceId || !body.email) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const ctx = await requireMember(body.workspaceId);
  if (ctx.error || !ctx.user) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json({ error: "Solo owners y admins pueden invitar" }, { status: 403 });
  }

  const { count } = await ctx.supabase
    .from("workspace_members")
    .select("user_id", { count: "exact", head: true })
    .eq("workspace_id", body.workspaceId);
  if ((count ?? 0) >= FREE_PLAN.maxMembers) {
    return NextResponse.json({ error: "Límite de miembros del plan Free" }, { status: 402 });
  }

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await ctx.supabase.from("workspace_invitations").insert({
    workspace_id: body.workspaceId,
    email: body.email.trim().toLowerCase(),
    role: body.role ?? "member",
    invited_by: ctx.user.id,
    token,
    expires_at: expires,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const url = `${site}/invite/${token}`;
  return NextResponse.json({ ok: true, url, token });
}
