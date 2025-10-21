import type {
  MCPServerToolsResponse,
  MCPServerTransport,
  MCPToolSummary,
} from "../stores";

export interface FetchMCPServerToolsOptions {
  serverId: string;
  name?: string;
  transport: MCPServerTransport;
  api?: string;
}

export interface FetchMCPServerToolsResult {
  tools: MCPToolSummary[];
  error: string | null;
}

/**
 * Fetch tools from an MCP server via the discovery API endpoint.
 * This is a standalone utility that can be called from anywhere (hooks, effects, event handlers).
 */
export async function fetchMCPServerTools(
  options: FetchMCPServerToolsOptions
): Promise<FetchMCPServerToolsResult> {
  const { serverId, name, transport, api = "/api/mcp-discovery" } = options;

  try {
    const response = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        server: {
          id: serverId,
          name,
          transport,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to load MCP tools: ${response.status}`);
    }

    const data: MCPServerToolsResponse = await response.json();
    const tools = Array.isArray(data.tools) ? data.tools : [];

    // Extract error message from response
    const errorMessage =
      Array.isArray(data.errors) && data.errors.length > 0
        ? data.errors[0]?.message ?? "Failed to load MCP tools"
        : data.error
        ? typeof data.error === "string"
          ? data.error
          : "Failed to load MCP tools"
        : null;

    return {
      tools,
      error: errorMessage,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error && typeof error.message === "string"
        ? error.message
        : "Failed to load MCP tools";
    return {
      tools: [],
      error: message,
    };
  }
}
