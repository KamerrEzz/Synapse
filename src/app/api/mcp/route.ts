import { mcpHttpHandler } from "@/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export { mcpHttpHandler as GET, mcpHttpHandler as POST, mcpHttpHandler as DELETE };
