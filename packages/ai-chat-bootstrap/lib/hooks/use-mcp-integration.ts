import { useEffect } from "react";
import { useAIMCPServersStore } from "../stores";
import type { SerializedMCPServer } from "../stores/mcp";
import { fetchMCPServerTools } from "../utils/mcp-utils";
import { logDevError } from "../utils/dev-logger";

export interface UseMCPIntegrationOptions {
  enabled: boolean;
  api?: string;
  servers?: SerializedMCPServer[];
  toolRenderers?: Array<{
    serverUrl: string;
    toolName: string;
    render: (result: unknown) => React.ReactNode;
  }>;
  showErrorMessages?: boolean;
}

/**
 * Hook to manage MCP (Model Context Protocol) server integration.
 * Handles server configuration, registration, and automatic tool fetching.
 */
export function useMCPIntegration({
  enabled,
  api,
  servers,
  toolRenderers,
  showErrorMessages = false,
}: UseMCPIntegrationOptions) {
  const setMcpEnabled = useAIMCPServersStore((state) => state.setEnabled);
  const setMcpDefaultApi = useAIMCPServersStore((state) => state.setDefaultApi);
  const setMcpConfigurations = useAIMCPServersStore(
    (state) => state.setConfigurations
  );
  const registerServer = useAIMCPServersStore((state) => state.registerServer);
  const setServerLoading = useAIMCPServersStore(
    (state) => state.setServerLoading
  );
  const setServerError = useAIMCPServersStore((state) => state.setServerError);
  const setServerTools = useAIMCPServersStore((state) => state.setServerTools);
  const registerToolRenderer = useAIMCPServersStore(
    (state) => state.registerToolRenderer
  );
  const clearToolRenderers = useAIMCPServersStore(
    (state) => state.clearToolRenderers
  );

  // Configure MCP enabled state and server settings
  useEffect(() => {
    setMcpEnabled(enabled);
    if (!enabled) return;
    try {
      if (api) {
        setMcpDefaultApi(api);
      }
      if (Array.isArray(servers)) {
        setMcpConfigurations(servers);
      }
    } catch (error) {
      logDevError(
        "[acb][useMCPIntegration] failed to configure MCP servers from props",
        error,
        showErrorMessages
      );
    }
  }, [
    enabled,
    api,
    servers,
    setMcpDefaultApi,
    setMcpEnabled,
    setMcpConfigurations,
    showErrorMessages,
  ]);

  // Register tool renderers
  useEffect(() => {
    if (!enabled) {
      clearToolRenderers();
      return;
    }

    // Clear existing renderers first
    clearToolRenderers();

    // Register new renderers
    if (Array.isArray(toolRenderers)) {
      try {
        toolRenderers.forEach(({ serverUrl, toolName, render }) => {
          registerToolRenderer(serverUrl, toolName, render);
        });
      } catch (error) {
        logDevError(
          "[acb][useMCPIntegration] failed to register tool renderers",
          error,
          showErrorMessages
        );
      }
    }
  }, [
    enabled,
    toolRenderers,
    registerToolRenderer,
    clearToolRenderers,
    showErrorMessages,
  ]);

  // Auto-fetch tools for servers configured via props
  useEffect(() => {
    if (!enabled || !Array.isArray(servers)) return;

    const apiEndpoint = api ?? "/api/mcp-discovery";
    const mcpStore = useAIMCPServersStore.getState();

    // Fetch tools for each configured server
    servers.forEach((server) => {
      const configSignature = JSON.stringify({
        name: server.name ?? null,
        transport: server.transport,
      });

      // Check if server already exists with same config
      const existingServer = mcpStore.servers.get(server.id);
      const shouldFetch =
        !existingServer ||
        existingServer.configSignature !== configSignature ||
        (!existingServer.tools.length &&
          !existingServer.error &&
          !existingServer.isLoading);

      // Register the server (registerServer handles config changes)
      registerServer({
        id: server.id,
        name: server.name,
        transport: server.transport,
        configSignature,
      });

      // Only fetch if needed
      if (shouldFetch) {
        setServerLoading(server.id, true);
        setServerError(server.id, null);

        fetchMCPServerTools({
          serverId: server.id,
          name: server.name,
          transport: server.transport,
          api: apiEndpoint,
        })
          .then((result) => {
            setServerTools(server.id, result.tools, result.error ?? undefined);
            if (result.error && result.tools.length === 0) {
              setServerError(server.id, result.error);
            }
          })
          .catch((error) => {
            const message =
              error instanceof Error
                ? error.message
                : "Failed to load MCP tools";
            setServerError(server.id, message);
          });
      }
    });
  }, [
    enabled,
    api,
    servers,
    registerServer,
    setServerLoading,
    setServerError,
    setServerTools,
  ]);
}
