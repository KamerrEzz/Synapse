import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type McpSession = {
  userId: string;
  tokenId: string;
  workspaceId: string | null;
};

export function mintMcpSecret() {
  return `syn_mcp_${randomBytes(32).toString("hex")}`;
}

export function hashMcpSecret(secret: string) {
  return createHash("sha256").update(secret.trim()).digest("hex");
}

export async function resolveMcpSecret(secret: string): Promise<McpSession | null> {
  const trimmed = secret.trim();
  if (!trimmed.startsWith("syn_mcp_") || trimmed.length < 20) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mcp_tokens")
    .select("id, user_id, workspace_id, revoked_at")
    .eq("token_hash", hashMcpSecret(trimmed))
    .maybeSingle();
  if (error || !data || data.revoked_at) return null;
  await admin.from("mcp_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return {
    userId: data.user_id as string,
    tokenId: data.id as string,
    workspaceId: (data.workspace_id as string | null) ?? null,
  };
}

export async function assertWorkspaceAccess(session: McpSession, workspaceId: string) {
  if (session.workspaceId && session.workspaceId !== workspaceId) {
    throw new Error("Este token no cubre ese workspace");
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (!data) throw new Error("Sin acceso a este workspace");
  return data.role as string;
}

export async function resolveWorkspaceRef(session: McpSession, ref: string) {
  const admin = createAdminClient();
  const byId = /^[0-9a-f-]{36}$/i.test(ref);
  const { data } = await admin
    .from("workspaces")
    .select("id, name, slug, description, plan")
    .eq(byId ? "id" : "slug", ref)
    .maybeSingle();
  if (!data) throw new Error("Workspace no encontrado");
  await assertWorkspaceAccess(session, data.id);
  return data as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    plan: string;
  };
}
