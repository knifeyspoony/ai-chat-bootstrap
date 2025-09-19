import { create } from "zustand";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

export interface MCPToolSummary {
  name: string;
  description?: string;
}

export type MCPServerTransport =
  | {
      type: "sse";
      url: string;
      headers?: Record<string, string>;
    }
  | {
      type: "streamable-http";
      url: string;
      headers?: Record<string, string>;
    };

export interface SerializedMCPServer {
  id: string;
  name?: string;
  transport: MCPServerTransport;
}

export interface MCPServerEntry {
  id: string;
  name?: string;
  transport: MCPServerTransport;
  tools: MCPToolSummary[];
  isLoading: boolean;
  error: string | null;
  lastLoadedAt?: number;
  configSignature: string;
}

interface RegisterMCPServerArgs {
  id: string;
  name?: string;
  transport: MCPServerTransport;
  configSignature: string;
}

interface MCPServersStore {
  servers: Map<string, MCPServerEntry>;
  configurations: SerializedMCPServer[];
  defaultApi?: string;
  enabled: boolean;
  registerServer: (server: RegisterMCPServerArgs) => void;
  unregisterServer: (id: string) => void;
  setServerLoading: (id: string, isLoading: boolean) => void;
  setServerError: (id: string, error: string | null) => void;
  setServerTools: (id: string, tools: MCPToolSummary[]) => void;
  serializeServersForBackend: () => SerializedMCPServer[];
  getAllToolSummaries: () => MCPToolSummary[];
  setConfigurations: (servers: SerializedMCPServer[]) => void;
  addOrUpdateConfiguration: (server: SerializedMCPServer) => void;
  removeConfiguration: (id: string) => void;
  setDefaultApi: (api: string) => void;
  setEnabled: (enabled: boolean) => void;
  getServersAsStableObject: () => Record<string, MCPServerEntry>;
}

export interface MCPServerToolsRequest {
  server: SerializedMCPServer;
}

export interface MCPServerToolsResponse {
  tools: MCPToolSummary[];
  error?: string;
}

export const useAIMCPServersStore = create<MCPServersStore>((set, get) => ({
  servers: new Map<string, MCPServerEntry>(),
  configurations: [],
  defaultApi: "/api/mcp",
  enabled: false,

  registerServer: ({ id, name, transport, configSignature }) => {
    set((state) => {
      const current = state.servers.get(id);
      const shouldReset =
        !current || current.configSignature !== configSignature;
      const servers = new Map(state.servers);
      servers.set(id, {
        id,
        name,
        transport: {
          type: transport.type,
          url: transport.url,
          headers: transport.headers ? { ...transport.headers } : undefined,
        },
        tools: shouldReset ? [] : current?.tools ?? [],
        isLoading: shouldReset ? false : current?.isLoading ?? false,
        error: shouldReset ? null : current?.error ?? null,
        lastLoadedAt: shouldReset ? undefined : current?.lastLoadedAt,
        configSignature,
      });
      const exists = state.configurations.some((cfg) => cfg.id === id);
      const configurations = exists
        ? state.configurations
        : [
            ...state.configurations,
            {
              id,
              name,
              transport: {
                type: transport.type,
                url: transport.url,
                headers: transport.headers
                  ? { ...transport.headers }
                  : undefined,
              },
            },
          ];
      return { servers, configurations };
    });
  },

  unregisterServer: (id) => {
    set((state) => {
      if (!state.servers.has(id)) return state;
      const servers = new Map(state.servers);
      servers.delete(id);
      return { servers };
    });
  },

  setServerLoading: (id, isLoading) => {
    set((state) => {
      const current = state.servers.get(id);
      if (!current) return state;
      const servers = new Map(state.servers);
      servers.set(id, { ...current, isLoading });
      return { servers };
    });
  },

  setServerError: (id, error) => {
    set((state) => {
      const current = state.servers.get(id);
      if (!current) return state;
      const servers = new Map(state.servers);
      servers.set(id, { ...current, error, isLoading: false });
      return { servers };
    });
  },

  setServerTools: (id, tools) => {
    set((state) => {
      const current = state.servers.get(id);
      if (!current) return state;
      const servers = new Map(state.servers);
      servers.set(id, {
        ...current,
        tools,
        error: null,
        isLoading: false,
        lastLoadedAt: Date.now(),
      });
      return { servers };
    });
  },

  serializeServersForBackend: () => {
    return get().configurations.map((server) => ({
      id: server.id,
      name: server.name,
      transport: {
        type: server.transport.type,
        url: server.transport.url,
        headers: server.transport.headers
          ? { ...server.transport.headers }
          : undefined,
      },
    }));
  },

  getAllToolSummaries: () => {
    return Array.from(get().servers.values()).flatMap((server) => server.tools);
  },

  setConfigurations: (configs) => {
    set((state) => {
      const nextServers = new Map(state.servers);
      // Remove any registered entries not present anymore
      const allowedIds = new Set(configs.map((cfg) => cfg.id));
      for (const id of nextServers.keys()) {
        if (!allowedIds.has(id)) {
          nextServers.delete(id);
        }
      }
      return { configurations: configs, servers: nextServers };
    });
  },

  addOrUpdateConfiguration: (server) => {
    set((state) => {
      const others = state.configurations.filter((cfg) => cfg.id !== server.id);
      return { configurations: [...others, server] };
    });
  },

  removeConfiguration: (id) => {
    set((state) => {
      const configurations = state.configurations.filter((cfg) => cfg.id !== id);
      const servers = new Map(state.servers);
      servers.delete(id);
      return { configurations, servers };
    });
  },

  setDefaultApi: (api) => {
    set({ defaultApi: api });
  },

  setEnabled: (enabled) => {
    set({ enabled });
  },

  getServersAsStableObject: () => {
    const { servers } = get();
    const result: Record<string, MCPServerEntry> = {};
    for (const [key, value] of servers) {
      result[key] = value;
    }
    return result;
  },
}));

// Stable selector hook that returns servers as an object with stable references
export function useStableMCPServers() {
  const servers = useAIMCPServersStore(useShallow((state) => state.servers));

  return useMemo(() => {
    const result: Record<string, MCPServerEntry> = {};
    for (const [key, value] of servers) {
      result[key] = value;
    }
    return result;
  }, [servers]);
}
