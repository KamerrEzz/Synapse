import { metadataCorsOptionsRequestHandler } from "mcp-handler";
import { oauthNotSupportedResponse } from "@/mcp/oauth-not-supported";

export const runtime = "nodejs";

function metadata(req: Request) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const resource = `${origin.replace(/\/$/, "")}/api/mcp`;
  return Response.json(
    {
      resource,
      bearer_methods_supported: ["header"],
      scopes_supported: ["synapse"],
      authorization_servers: [] as string[],
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "max-age=3600",
      },
    },
  );
}

export function GET(req: Request) {
  return metadata(req);
}

export function POST() {
  return oauthNotSupportedResponse();
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
