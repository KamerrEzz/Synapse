import { metadataCorsOptionsRequestHandler } from "mcp-handler";
import { oauthNotSupportedResponse } from "@/mcp/oauth-not-supported";

export const runtime = "nodejs";

export function GET() {
  return oauthNotSupportedResponse();
}

export function POST() {
  return oauthNotSupportedResponse();
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
