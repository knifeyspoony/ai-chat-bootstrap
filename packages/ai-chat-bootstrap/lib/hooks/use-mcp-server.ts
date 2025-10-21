import { useCallback, useEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  useAIMCPServersStore,
  type MCPServerToolsResponse,
  type MCPServerTransport,
  type MCPToolSummary,
} from "../stores";

export interface UseMCPServerOptions {
  id?: string;
  url: string;
  headers?: Record<string, string>;
  name?: string;
  autoFetchTools?: boolean;
  transportType?: MCPServerTransport["type"];
  api?: string;
}

export interface UseMCPServerReturn {
  id: string;
  name?: string;
  isLoading: boolean;
  error: string | null;
  tools: MCPToolSummary[];
  lastLoadedAt?: number;
  refresh: () => Promise<void>;
}

/**
 * Register an MCP server and surface its tool metadata.
 * Automatically fetches tool names/descriptions (optional) so the UI and prompts
 * can reflect available MCP capabilities.
 */
export function useMCPServer(options: UseMCPServerOptions): UseMCPServerReturn {
  const {
    id: explicitId,
    url,
    headers,
    name,
    autoFetchTools = true,
    transportType = "sse",
    api,
  } = options;

  if (!url) {
    throw new Error("useMCPServer requires a url");
  }

  const serverId = explicitId ?? url;

  const registerServer = useAIMCPServersStore((state) => state.registerServer);
  const unregisterServer = useAIMCPServersStore(
    (state) => state.unregisterServer
  );
  const setServerLoading = useAIMCPServersStore(
    (state) => state.setServerLoading
  );
  const setServerError = useAIMCPServersStore((state) => state.setServerError);
  const setServerTools = useAIMCPServersStore((state) => state.setServerTools);

  const server = useAIMCPServersStore(
    useShallow((state) => state.servers.get(serverId))
  );
  const defaultApi = useAIMCPServersStore((state) => state.defaultApi);

  const transport: MCPServerTransport = useMemo(() => {
    const mappedHeaders = headers ? { ...headers } : undefined;
    return { type: transportType, url, headers: mappedHeaders };
  }, [url, headers, transportType]);

  const configSignature = useMemo(() => {
    return JSON.stringify({ name: name ?? null, transport });
  }, [name, transport]);

  useEffect(() => {
    registerServer({
      id: serverId,
      name,
      transport,
      configSignature,
    });
    return () => {
      unregisterServer(serverId);
    };
  }, [
    registerServer,
    unregisterServer,
    serverId,
    name,
    transport,
    configSignature,
  ]);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshTools = useCallback(async () => {
    setServerLoading(serverId, true);
    setServerError(serverId, null);
    try {
      const targetApi = api ?? defaultApi ?? "/api/mcp-discovery";
      const response = await fetch(targetApi, {
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
      const summaries = Array.isArray(data.tools) ? data.tools : [];
      const errorMessage =
        Array.isArray(data.errors) && data.errors.length > 0
          ? data.errors[0]?.message ?? "Failed to load MCP tools"
          : data.error
          ? typeof data.error === "string"
            ? data.error
            : "Failed to load MCP tools"
          : null;
      if (mountedRef.current) {
        setServerTools(serverId, summaries, errorMessage ?? undefined);
        if (errorMessage && summaries.length === 0) {
          // Ensure the error is surfaced if no tools were updated.
          setServerError(serverId, errorMessage);
        }
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error && typeof error.message === "string"
          ? error.message
          : "Failed to load MCP tools";
      if (mountedRef.current) {
        setServerError(serverId, message);
      }
    }
  }, [
    api,
    defaultApi,
    name,
    serverId,
    setServerError,
    setServerLoading,
    setServerTools,
    transport,
  ]);

  useEffect(() => {
    if (!autoFetchTools) return;
    refreshTools();
  }, [autoFetchTools, refreshTools]);

  return {
    id: serverId,
    name,
    isLoading: server?.isLoading ?? false,
    error: server?.error ?? null,
    tools: server?.tools ?? [],
    lastLoadedAt: server?.lastLoadedAt,
    refresh: () => refreshTools(),
  };
}
