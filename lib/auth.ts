import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function getProfile() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return { supabase, user, profile: data };
}

export async function getWorkspaceBySlug(slug: string) {
  const { supabase, user, profile } = await getProfile();
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !workspace) {
    redirect("/workspaces");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/workspaces");
  }

  return {
    supabase,
    user,
    profile,
    workspace,
    role: membership.role as "owner" | "admin" | "member",
  };
}
