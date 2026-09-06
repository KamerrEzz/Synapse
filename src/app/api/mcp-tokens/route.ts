import { createClient } from "@/lib/supabase/server";
import { hashMcpSecret, mintMcpSecret } from "@/mcp/auth";
import type { McpToken } from "@/types/database";

async function requireSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, user };
}

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return Response.json({ error: "No autenticado" }, { status: 401 });
  const { data, error } = await ctx.supabase.rpc("list_own_mcp_tokens");
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ tokens: (data ?? []) as McpToken[] });
}

export async function POST(request: Request) {
  const ctx = await requireSession();
  if (!ctx) return Response.json({ error: "No autenticado" }, { status: 401 });
  const body = (await request.json()) as {
    name?: string;
    workspaceId?: string | null;
  };
  const name = (body.name?.trim() || "Agente").slice(0, 80);
  const workspaceId = body.workspaceId || null;
  const secret = mintMcpSecret();
  const { data, error } = await ctx.supabase.rpc("insert_own_mcp_token", {
    p_token_hash: hashMcpSecret(secret),
    p_last4: secret.slice(-4),
    p_name: name,
    p_workspace_id: workspaceId,
  });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  return Response.json({
    id: data,
    name,
    secret,
    last4: secret.slice(-4),
    workspaceId,
    url: `${origin.replace(/\/$/, "")}/api/mcp`,
  });
}

export async function DELETE(request: Request) {
  const ctx = await requireSession();
  if (!ctx) return Response.json({ error: "No autenticado" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Falta el token" }, { status: 400 });
  const { error } = await ctx.supabase.rpc("revoke_own_mcp_token", { p_id: id });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
