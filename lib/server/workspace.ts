import { createClient } from "@/lib/supabase/server";

export async function requireMember(workspaceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "No autenticado" as const, status: 401 as const, user: null, supabase };
  }
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) {
    return { error: "Sin acceso a este workspace" as const, status: 403 as const, user, supabase };
  }
  return { error: null, status: 200 as const, user, supabase, role: member.role as string };
}
