import type {
  MCPServerToolsRequest,
  MCPServerToolsResponse,
} from "../stores/mcp";
import { loadMcpTools, type LoadMcpToolsResult } from "../utils/backend-tool-utils";
import { JSON_HEADERS } from "./shared";

export interface CreateMcpToolsHandlerOptions {
  onError?: (error: unknown, ctx: { req: Request }) => void;
}

export function createMcpToolsHandler(
  options: CreateMcpToolsHandlerOptions = {}
): (req: Request) => Promise<Response> {
  const { onError } = options;

  return async function mcpToolsHandler(req: Request): Promise<Response> {
    let requestBody: MCPServerToolsRequest | undefined;
    try {
      requestBody = (await req.json()) as MCPServerToolsRequest;
    } catch (error) {
      onError?.(error, { req });
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    if (!requestBody?.server) {
      return new Response(
        JSON.stringify({ error: "Missing server descriptor" }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    try {
      const result: LoadMcpToolsResult = await loadMcpTools([requestBody.server]);
      const response: MCPServerToolsResponse = {
        tools: result.toolSummaries,
      };
      return new Response(JSON.stringify(response), {
        headers: JSON_HEADERS,
      });
    } catch (error) {
      onError?.(error, { req });
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load MCP tools";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }
  };
}
