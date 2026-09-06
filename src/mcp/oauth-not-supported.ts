const BODY = {
  error: "invalid_request",
  error_description:
    "Synapse MCP does not use OAuth. Create a personal token in Ajustes and send Authorization: Bearer syn_mcp_…. In OpenCode set oauth: false and do not run opencode mcp auth.",
};

export function oauthNotSupportedResponse() {
  return Response.json(BODY, {
    status: 404,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
