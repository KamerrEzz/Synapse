import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

export function userClient(req: Request) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const auth = req.headers.get("Authorization") ?? "";
  return createClient(url, anon, {
    global: { headers: { Authorization: auth } },
  });
}

export async function requireMember(
  req: Request,
  workspaceId: string,
) {
  const supabase = userClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: json({ error: "No autenticado" }, 401) };
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { error: json({ error: "Sin acceso" }, 403) };
  return { supabase, user, role: member.role as string };
}
