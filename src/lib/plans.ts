export const FREE_PLAN = {
  aiTokensPerMonth: 100_000,
  maxFiles: 25,
  maxMembers: 10,
  maxDocuments: 50,
} as const;

export const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
};
