import { jsonSchema } from "@ai-sdk/provider-utils";
import { experimental_createMCPClient, tool } from "ai";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { EventSourceInitDict } from "eventsource";
import type {
  MCPServerTransport,
  MCPToolSummary,
  SerializedMCPServer,
} from "../stores/mcp";
import type { SerializedTool } from "../stores/tools";

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
 * Connect to any declared MCP servers and return their tool definitions.
 * Each server is queried sequentially; failures are logged and skipped.
 */
export interface LoadMcpToolsResult {
  tools: Record<string, BackendTool>;
  toolSummaries: MCPToolSummary[];
}

type ExperimentalMcpClient = Awaited<
  ReturnType<typeof experimental_createMCPClient>
>;

interface CachedClientEntry {
  promise: Promise<ExperimentalMcpClient>;
  signature: string;
}

const clientCache = new Map<string, CachedClientEntry>();

function canonicalizeHeaders(headers?: Record<string, string>) {
  if (!headers) return undefined;
  return Object.fromEntries(
    Object.entries(headers).sort(([a], [b]) => a.localeCompare(b))
  );
}

function createConfigSignature(server: SerializedMCPServer) {
  return JSON.stringify({
    name: server.name ?? null,
    transport: {
      type: server.transport.type,
      url: server.transport.url,
      headers: canonicalizeHeaders(server.transport.headers),
    },
  });
}

function createTransportForServer(config: MCPServerTransport) {
  const url = new URL(config.url);
  if (config.type === "sse") {
    const eventSourceInit = config.headers
      ? ({ headers: { ...config.headers } } as unknown as EventSourceInitDict)
      : undefined;
    return new SSEClientTransport(url, {
      eventSourceInit,
      requestInit: config.headers
        ? { headers: { ...config.headers } }
        : undefined,
    });
  }
  if (config.type === "streamable-http") {
    return new StreamableHTTPClientTransport(url, {
      requestInit: config.headers
        ? { headers: { ...config.headers } }
        : undefined,
    });
  }
  throw new Error("Unsupported MCP transport type");
}

async function shutdownAndCloseClient(client: ExperimentalMcpClient) {
  const maybeClientWithNotifications = client as {
    notification?: (notification: { method: string }) => Promise<void>;
    close: () => Promise<void>;
  };

  if (typeof maybeClientWithNotifications.notification === "function") {
    for (const method of ["shutdown", "notifications/shutdown"]) {
      try {
        await maybeClientWithNotifications.notification({ method });
      } catch {
        // Best effort shutdown; ignore failures so we still close the client.
      }
    }
  }

  await client.close().catch(() => {});
}

async function getClientForServer(server: SerializedMCPServer) {
  const signature = createConfigSignature(server);
  const cached = clientCache.get(server.id);
  if (cached && cached.signature === signature) {
    return cached.promise;
  }

  if (cached) {
    clientCache.delete(server.id);
    try {
      const client = await cached.promise;
      await shutdownAndCloseClient(client);
    } catch {
      // Ignore errors closing stale client
    }
  }

  const promise = (async () => {
    const transport = createTransportForServer(server.transport);
    return experimental_createMCPClient({
      name: server.name,
      transport,
    });
  })();

  clientCache.set(server.id, { promise, signature });

  try {
    return await promise;
  } catch (error) {
    if (clientCache.get(server.id)?.promise === promise) {
      clientCache.delete(server.id);
    }
    throw error;
  }
}

async function invalidateClient(serverId: string) {
  const cached = clientCache.get(serverId);
  if (!cached) return;
  clientCache.delete(serverId);
  try {
    const client = await cached.promise;
    await shutdownAndCloseClient(client);
  } catch {
    // Ignore errors while tearing down
  }
}

export async function loadMcpTools(
  servers?: SerializedMCPServer[] | null
): Promise<LoadMcpToolsResult> {
  if (!servers || servers.length === 0) {
    return { tools: {}, toolSummaries: [] };
  }

  const aggregated: Record<string, BackendTool> = {};
  const summaries: MCPToolSummary[] = [];

  for (const server of servers) {
    try {
      const client = await getClientForServer(server);
      const toolSet = await client.tools();
      for (const [name, mcpTool] of Object.entries(toolSet)) {
        aggregated[name] = mcpTool as unknown as BackendTool;
        const description = (mcpTool as { description?: string }).description;
        summaries.push({ name, description });
      }
    } catch (error) {
      console.warn(
        `[acb][mcp] failed to load MCP tools from ${server.transport.url}`,
        error
      );
      await invalidateClient(server.id);
    }
  }

  return { tools: aggregated, toolSummaries: summaries };
}
