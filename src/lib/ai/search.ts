import type { SupabaseClient } from "@supabase/supabase-js";
import type { SearchHit } from "@/types/database";

export function toSqlVector(values: number[]): string {
  return `[${values.join(",")}]`;
}

export async function hybridSearchAsUser(
  admin: SupabaseClient,
  userId: string,
  workspaceId: string,
  query: string,
  embedding: number[],
  matchCount: number,
): Promise<SearchHit[]> {
  const { data, error } = await admin.rpc("mcp_hybrid_search", {
    p_user_id: userId,
    p_workspace_id: workspaceId,
    p_query: query,
    p_embedding: toSqlVector(embedding),
    p_match_count: matchCount,
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as SearchHit[];
}

export async function hybridSearch(
  supabase: SupabaseClient,
  workspaceId: string,
  query: string,
  embedding: number[],
  matchCount: number,
): Promise<SearchHit[]> {
  const { data, error } = await supabase.rpc("hybrid_search", {
    p_workspace_id: workspaceId,
    p_query: query,
    p_embedding: toSqlVector(embedding),
    p_match_count: matchCount,
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as SearchHit[];
}
