/**
 * Backend utilities for loading and managing MCP tools.
 * Refactored to use robust client management with proper error handling.
 */

import { jsonSchema } from "@ai-sdk/provider-utils";
import { tool } from "ai";
import type {
  MCPServerToolError,
  MCPToolSummary,
  SerializedMCPServer,
} from "../stores/mcp";
import type { SerializedTool } from "../stores/tools";
import { MCPClientManager } from "./mcp-client-manager";
import { MCPErrorAdapter } from "./mcp-errors";

export type BackendTool = ReturnType<typeof tool>;

/**
 * Deserialize an array of SerializedTool objects (sent from frontend) into a
 * map of backend tool definitions usable by the AI SDK.
 */
export function deserializeFrontendTools(serialized?: SerializedTool[] | null) {
  if (!serialized || serialized.length === 0)
    return {} as Record<string, BackendTool>;
  return serialized.reduce((acc, t) => {
    const inputSchema = jsonSchema(
      t.inputSchema as Parameters<typeof jsonSchema>[0]
    ) as unknown as Parameters<typeof tool>[0]["inputSchema"];
    acc[t.name] = tool({
      description: t.description,
      inputSchema,
      // Backend doesn't execute; frontend handles tool execution results.
    });
    return acc;
  }, {} as Record<string, BackendTool>);
}

/**
 * Result of loading MCP tools
 */
export interface LoadMcpToolsResult {
  tools: Record<string, BackendTool>;
  toolSummaries: MCPToolSummary[];
  errors: MCPServerToolError[];
}

// Singleton client manager instance
const clientManager = new MCPClientManager();

/**
 * Load tools from MCP servers.
 * Uses the new client manager for robust connection handling.
 */
export async function loadMcpTools(
  servers?: SerializedMCPServer[] | null
): Promise<LoadMcpToolsResult> {
  if (!servers || servers.length === 0) {
    return { tools: {}, toolSummaries: [], errors: [] };
  }

  const aggregated: Record<string, BackendTool> = {};
  const summaries: MCPToolSummary[] = [];
  const failures: MCPServerToolError[] = [];

  for (const server of servers) {
    try {
      // Get client through manager (handles caching, health, circuit breaker)
      const client = await clientManager.getClient(server);

      // Fetch tools from server
      const toolSet = await client.tools();

      // Register each tool
      for (const [name, mcpTool] of Object.entries(toolSet)) {
        // Add server URL metadata to the tool for renderer lookup
        const toolWithMetadata = mcpTool as unknown as BackendTool & {
          __mcpServerUrl?: string;
        };
        toolWithMetadata.__mcpServerUrl = server.transport.url;
        aggregated[name] = toolWithMetadata;

        const description = (mcpTool as { description?: string }).description;
        summaries.push({ name, description });
      }
    } catch (error) {
      // Convert to our error type for consistent handling
      const mcpError = MCPErrorAdapter.fromSDKError(error, {
        serverId: server.id,
        serverUrl: server.transport.url,
      });

      console.warn(
        `[acb][mcp] Failed to load MCP tools from ${server.transport.url}`,
        {
          error: mcpError.message,
          code: mcpError.code,
          recoverable: mcpError.recoverable,
        }
      );

      // Close the failed client
      await clientManager.closeClient(server.id);

      // Record the failure
      failures.push({
        serverId: server.id,
        serverName: server.name,
        url: server.transport.url,
        message: mcpError.message,
      });
    }
  }

  return { tools: aggregated, toolSummaries: summaries, errors: failures };
}

/**
 * Clear all cached MCP clients.
 * Useful for development/testing and cleanup.
 */
export async function clearMCPClientCache() {
  await clientManager.closeAll();
}

// Clean up MCP clients on HMR (Hot Module Reload) to prevent stale connections
if (typeof module !== 'undefined' && (module as NodeModule & { hot?: { dispose: (callback: () => void) => void } }).hot) {
  (module as NodeModule & { hot?: { dispose: (callback: () => void) => void } }).hot?.dispose(() => {
    clearMCPClientCache().catch(() => {
      // Silently ignore cleanup errors during HMR
    });
  });
}
