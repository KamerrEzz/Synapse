import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "No autenticado" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  const body = await req.json();
  const workspaceId = body.workspaceId as string;
  const email = (body.email as string).trim().toLowerCase();
  const role = (body.role as string) || "member";

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return json({ error: "No autenticado" }, 401);

  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    return json({ error: "Solo owners y admins pueden invitar" }, 403);
  }

  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("workspace_invitations").insert({
    workspace_id: workspaceId,
    email,
    role,
    invited_by: userData.user.id,
    token,
    expires_at,
  });
  if (error) return json({ error: error.message }, 400);

  const site = Deno.env.get("SITE_URL") ?? Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? "";
  return json({ url: `${site}/invite/${token}`, token });
});
