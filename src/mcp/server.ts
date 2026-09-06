import { createMcpHandler } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { resolveMcpSecret } from "@/mcp/auth";
import { registerSynapseTools } from "@/mcp/tools";

const mcpHandler = createMcpHandler(
  (server) => {
    registerSynapseTools(server);
  },
  {
    serverInfo: { name: "synapse", version: "0.1.0" },
    instructions:
      "Synapse is a private workspace wiki, files, chat, and RAG. Call list_workspaces first. Wiki CRUD: create_document, get_document, update_document, delete_document. Use search or ask for grounded answers. Never invent facts that are not in retrieved chunks.",
  },
);

async function verifyToken(bearerToken?: string): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;
  const session = await resolveMcpSecret(bearerToken);
  if (!session) return undefined;
  return {
    token: bearerToken,
    clientId: session.tokenId,
    scopes: ["synapse"],
    extra: { ...session },
  };
}

function unauthorized() {
  return Response.json(
    {
      error: "invalid_token",
      error_description:
        "Missing or invalid Bearer token. Create one in Ajustes. OpenCode needs oauth: false; do not run opencode mcp auth.",
    },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Bearer realm="synapse"',
      },
    },
  );
}

/** Bearer only. Do not send RFC 9728 resource_metadata or OpenCode will demand `mcp auth`. */
export async function mcpHttpHandler(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    const match = authHeader?.match(/^Bearer\s+(\S+)/i);
    const bearer = match?.[1];
    const authInfo = await verifyToken(bearer);
    if (!authInfo) return unauthorized();
    req.auth = authInfo;
    return mcpHandler(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de servidor MCP";
    const misconfigured = /SUPABASE_SERVICE_ROLE_KEY/i.test(message);
    return Response.json(
      {
        error: misconfigured ? "server_misconfigured" : "server_error",
        error_description: misconfigured
          ? "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor Next (.env.local). El token Bearer puede ser válido; sin esa clave no se puede comprobar."
          : message,
      },
      { status: 503 },
    );
  }
}
