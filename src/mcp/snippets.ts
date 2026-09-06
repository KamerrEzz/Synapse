export function mcpOriginUrl(origin: string) {
  return `${origin.replace(/\/$/, "")}/api/mcp`;
}

export function cursorMcpJson(url: string, secret: string) {
  return {
    mcpServers: {
      synapse: {
        url,
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      },
    },
  };
}

export function opencodeMcpJson(url: string, secret: string) {
  return {
    $schema: "https://opencode.ai/config.json",
    mcp: {
      servers: {
        synapse: {
          type: "remote",
          url,
          oauth: false,
          codemode: false,
          headers: {
            Authorization: `Bearer ${secret}`,
          },
        },
      },
    },
  };
}

/** Flat shape that `opencode mcp add` writes on OpenCode 1.x. */
export function opencodeMcpJsonLegacy(url: string, secret: string) {
  return {
    mcp: {
      synapse: {
        type: "remote",
        url,
        oauth: false,
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      },
    },
  };
}

export function opencodeAddCommand(url: string, secret: string) {
  return `opencode mcp add synapse --url ${url} --header Authorization="Bearer ${secret}"`;
}

export function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}
