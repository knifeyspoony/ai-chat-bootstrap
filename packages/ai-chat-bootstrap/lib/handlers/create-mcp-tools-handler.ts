import type {
  MCPServerToolsRequest,
  MCPServerToolsResponse,
} from "../stores/mcp";
import {
  loadMcpTools,
  type LoadMcpToolsResult,
} from "../utils/backend-tool-utils";
import { JSON_HEADERS } from "./shared";

export interface CreateMcpToolsHandlerOptions {
  onError?: (error: unknown, ctx: { req: Request }) => void;
  forwardHeaders?: string[];
}

export function createMcpToolsHandler(
  options: CreateMcpToolsHandlerOptions = {}
): (req: Request) => Promise<Response> {
  const { onError, forwardHeaders } = options;

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

    const forwardedHeaders =
      forwardHeaders && forwardHeaders.length > 0
        ? forwardHeaders.reduce<Record<string, string>>((acc, headerName) => {
            const value = req.headers.get(headerName);
            if (value !== null) {
              acc[headerName] = value;
            }
            return acc;
          }, {})
        : undefined;

    const normalizedHeaders = {
      ...(requestBody.server.transport.headers ?? {}),
      ...(forwardedHeaders ?? {}),
    };
    const normalizedServer = {
      ...requestBody.server,
      transport: {
        ...requestBody.server.transport,
        headers:
          Object.keys(normalizedHeaders).length > 0
            ? normalizedHeaders
            : undefined,
      },
    };

    try {
      const result: LoadMcpToolsResult = await loadMcpTools([normalizedServer]);
      const response: MCPServerToolsResponse = {
        tools: result.toolSummaries,
      };
      if (result.errors.length > 0) {
        response.errors = result.errors;
      }
      return new Response(JSON.stringify(response), {
        headers: JSON_HEADERS,
        status: result.errors.length > 0 ? 207 : 200,
      });
    } catch (error) {
      onError?.(error, { req });
      const message =
        error instanceof Error ? error.message : "Failed to load MCP tools";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }
  };
}
