import { describe, it, expect, beforeEach } from 'vitest';
import { useAIMCPServersStore, type MCPToolSummary, type SerializedMCPServer } from '../lib/stores/mcp';

describe('useAIMCPServersStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAIMCPServersStore.setState({
      servers: new Map(),
      configurations: [],
      defaultApi: '/api/mcp-discovery',
      enabled: false,
    });
  });

  describe('registerServer', () => {
    it('registers a new MCP server', () => {
      const transport = { type: 'sse' as const, url: 'http://localhost:3030/mcp' };
      const configSignature = JSON.stringify({ name: 'Test Server', transport });

      useAIMCPServersStore.getState().registerServer({
        id: 'test-server',
        name: 'Test Server',
        transport,
        configSignature,
      });

      const servers = useAIMCPServersStore.getState().servers;
      expect(servers.has('test-server')).toBe(true);

      const server = servers.get('test-server');
      expect(server).toMatchObject({
        id: 'test-server',
        name: 'Test Server',
        transport: {
          type: 'sse',
          url: 'http://localhost:3030/mcp',
        },
        tools: [],
        isLoading: false,
        error: null,
        configSignature,
      });
    });

    it('adds server to configurations when registering', () => {
      const transport = { type: 'sse' as const, url: 'http://localhost:3030/mcp' };
      const configSignature = JSON.stringify({ name: null, transport });

      useAIMCPServersStore.getState().registerServer({
        id: 'test-server',
        transport,
        configSignature,
      });

      const configs = useAIMCPServersStore.getState().configurations;
      expect(configs).toHaveLength(1);
      expect(configs[0]).toMatchObject({
        id: 'test-server',
        transport: {
          type: 'sse',
          url: 'http://localhost:3030/mcp',
        },
      });
    });

    it('preserves existing state when re-registering with same config', () => {
      const transport = { type: 'sse' as const, url: 'http://localhost:3030/mcp' };
      const configSignature = JSON.stringify({ name: 'Test', transport });
      const tools: MCPToolSummary[] = [{ name: 'test-tool', description: 'A test tool' }];

      // First registration
      useAIMCPServersStore.getState().registerServer({
        id: 'test-server',
        name: 'Test',
        transport,
        configSignature,
      });

      // Add tools manually
      useAIMCPServersStore.getState().setServerTools('test-server', tools);

      // Re-register with same config
      useAIMCPServersStore.getState().registerServer({
        id: 'test-server',
        name: 'Test',
        transport,
        configSignature,
      });

      const server = useAIMCPServersStore.getState().servers.get('test-server');
      expect(server?.tools).toEqual(tools);
    });

    it('resets state when config signature changes', () => {
      const transport1 = { type: 'sse' as const, url: 'http://localhost:3030/mcp' };
      const configSignature1 = JSON.stringify({ name: 'Test', transport: transport1 });
      const tools: MCPToolSummary[] = [{ name: 'test-tool' }];

      // Register with first config
      useAIMCPServersStore.getState().registerServer({
        id: 'test-server',
        name: 'Test',
        transport: transport1,
        configSignature: configSignature1,
      });
      useAIMCPServersStore.getState().setServerTools('test-server', tools);

      // Register with different config
      const transport2 = { type: 'sse' as const, url: 'http://localhost:3031/mcp' };
      const configSignature2 = JSON.stringify({ name: 'Test', transport: transport2 });

      useAIMCPServersStore.getState().registerServer({
        id: 'test-server',
        name: 'Test',
        transport: transport2,
        configSignature: configSignature2,
      });

      const server = useAIMCPServersStore.getState().servers.get('test-server');
      expect(server?.tools).toEqual([]);
      expect(server?.transport.url).toBe('http://localhost:3031/mcp');
    });

    it('handles headers in transport', () => {
      const transport = {
        type: 'sse' as const,
        url: 'http://localhost:3030/mcp',
        headers: { 'X-Custom-Header': 'test-value' },
      };
      const configSignature = JSON.stringify({ name: null, transport });

      useAIMCPServersStore.getState().registerServer({
        id: 'test-server',
        transport,
        configSignature,
      });

      const server = useAIMCPServersStore.getState().servers.get('test-server');
      expect(server?.transport.headers).toEqual({ 'X-Custom-Header': 'test-value' });
    });
  });

  describe('unregisterServer', () => {
    it('removes a server from the store', () => {
      const transport = { type: 'sse' as const, url: 'http://localhost:3030/mcp' };
      const configSignature = JSON.stringify({ name: null, transport });

      useAIMCPServersStore.getState().registerServer({
        id: 'test-server',
        transport,
        configSignature,
      });

      expect(useAIMCPServersStore.getState().servers.has('test-server')).toBe(true);

      useAIMCPServersStore.getState().unregisterServer('test-server');

      expect(useAIMCPServersStore.getState().servers.has('test-server')).toBe(false);
    });

    it('does not error when removing non-existent server', () => {
      expect(() => {
        useAIMCPServersStore.getState().unregisterServer('non-existent');
      }).not.toThrow();
    });
  });

  describe('setServerLoading', () => {
    it('sets loading state for a server', () => {
      const transport = { type: 'sse' as const, url: 'http://localhost:3030/mcp' };
      const configSignature = JSON.stringify({ name: null, transport });

      useAIMCPServersStore.getState().registerServer({
        id: 'test-server',
        transport,
        configSignature,
      });

      useAIMCPServersStore.getState().setServerLoading('test-server', true);

      const server = useAIMCPServersStore.getState().servers.get('test-server');
      expect(server?.isLoading).toBe(true);
    });

    it('does nothing for non-existent server', () => {
      const initialState = useAIMCPServersStore.getState();
      useAIMCPServersStore.getState().setServerLoading('non-existent', true);
      const afterState = useAIMCPServersStore.getState();
      expect(initialState).toBe(afterState);
    });
  });

  describe('setServerError', () => {
    it('sets error message for a server', () => {
      const transport = { type: 'sse' as const, url: 'http://localhost:3030/mcp' };
      const configSignature = JSON.stringify({ name: null, transport });

      useAIMCPServersStore.getState().registerServer({
        id: 'test-server',
        transport,
        configSignature,
      });

      useAIMCPServersStore.getState().setServerError('test-server', 'Connection failed');

      const server = useAIMCPServersStore.getState().servers.get('test-server');
      expect(server?.error).toBe('Connection failed');
      expect(server?.isLoading).toBe(false);
    });

    it('clears error when set to null', () => {
      const transport = { type: 'sse' as const, url: 'http://localhost:3030/mcp' };
      const configSignature = JSON.stringify({ name: null, transport });

      useAIMCPServersStore.getState().registerServer({
        id: 'test-server',
        transport,
        configSignature,
      });

      useAIMCPServersStore.getState().setServerError('test-server', 'Error');
      useAIMCPServersStore.getState().setServerError('test-server', null);

      const server = useAIMCPServersStore.getState().servers.get('test-server');
      expect(server?.error).toBe(null);
    });
  });

  describe('setServerTools', () => {
    it('updates tools for a server', () => {
      const transport = { type: 'sse' as const, url: 'http://localhost:3030/mcp' };
      const configSignature = JSON.stringify({ name: null, transport });
      const tools: MCPToolSummary[] = [
        { name: 'tool1', description: 'First tool' },
        { name: 'tool2', description: 'Second tool' },
      ];

      useAIMCPServersStore.getState().registerServer({
        id: 'test-server',
        transport,
        configSignature,
      });

      useAIMCPServersStore.getState().setServerTools('test-server', tools);

      const server = useAIMCPServersStore.getState().servers.get('test-server');
      expect(server?.tools).toEqual(tools);
      expect(server?.isLoading).toBe(false);
      expect(server?.error).toBe(null);
      expect(server?.lastLoadedAt).toBeTypeOf('number');
    });

    it('sets error alongside tools', () => {
      const transport = { type: 'sse' as const, url: 'http://localhost:3030/mcp' };
      const configSignature = JSON.stringify({ name: null, transport });
      const tools: MCPToolSummary[] = [{ name: 'tool1' }];

      useAIMCPServersStore.getState().registerServer({
        id: 'test-server',
        transport,
        configSignature,
      });

      useAIMCPServersStore.getState().setServerTools('test-server', tools, 'Partial failure');

      const server = useAIMCPServersStore.getState().servers.get('test-server');
      expect(server?.tools).toEqual(tools);
      expect(server?.error).toBe('Partial failure');
    });

    it('handles empty tools array', () => {
      const transport = { type: 'sse' as const, url: 'http://localhost:3030/mcp' };
      const configSignature = JSON.stringify({ name: null, transport });

      useAIMCPServersStore.getState().registerServer({
        id: 'test-server',
        transport,
        configSignature,
      });

      useAIMCPServersStore.getState().setServerTools('test-server', []);

      const server = useAIMCPServersStore.getState().servers.get('test-server');
      expect(server?.tools).toEqual([]);
    });
  });

  describe('serializeServersForBackend', () => {
    it('serializes registered servers for backend', () => {
      const transport1 = { type: 'sse' as const, url: 'http://localhost:3030/mcp' };
      const transport2 = {
        type: 'streamable-http' as const,
        url: 'http://localhost:3031/mcp',
        headers: { 'X-Auth': 'token' },
      };

      useAIMCPServersStore.getState().registerServer({
        id: 'server1',
        name: 'Server 1',
        transport: transport1,
        configSignature: JSON.stringify({ name: 'Server 1', transport: transport1 }),
      });

      useAIMCPServersStore.getState().registerServer({
        id: 'server2',
        name: 'Server 2',
        transport: transport2,
        configSignature: JSON.stringify({ name: 'Server 2', transport: transport2 }),
      });

      const serialized = useAIMCPServersStore.getState().serializeServersForBackend();

      expect(serialized).toHaveLength(2);
      expect(serialized[0]).toMatchObject({
        id: 'server1',
        name: 'Server 1',
        transport: { type: 'sse', url: 'http://localhost:3030/mcp' },
      });
      expect(serialized[1]).toMatchObject({
        id: 'server2',
        name: 'Server 2',
        transport: {
          type: 'streamable-http',
          url: 'http://localhost:3031/mcp',
          headers: { 'X-Auth': 'token' },
        },
      });
    });

    it('returns empty array when no servers', () => {
      const serialized = useAIMCPServersStore.getState().serializeServersForBackend();
      expect(serialized).toEqual([]);
    });
  });

  describe('getAllToolSummaries', () => {
    it('aggregates tools from all servers', () => {
      const transport1 = { type: 'sse' as const, url: 'http://localhost:3030/mcp' };
      const transport2 = { type: 'sse' as const, url: 'http://localhost:3031/mcp' };

      useAIMCPServersStore.getState().registerServer({
        id: 'server1',
        transport: transport1,
        configSignature: JSON.stringify({ name: null, transport: transport1 }),
      });

      useAIMCPServersStore.getState().registerServer({
        id: 'server2',
        transport: transport2,
        configSignature: JSON.stringify({ name: null, transport: transport2 }),
      });

      useAIMCPServersStore.getState().setServerTools('server1', [
        { name: 'tool1', description: 'Tool 1' },
        { name: 'tool2', description: 'Tool 2' },
      ]);

      useAIMCPServersStore.getState().setServerTools('server2', [
        { name: 'tool3', description: 'Tool 3' },
      ]);

      const allTools = useAIMCPServersStore.getState().getAllToolSummaries();

      expect(allTools).toHaveLength(3);
      expect(allTools).toEqual([
        { name: 'tool1', description: 'Tool 1' },
        { name: 'tool2', description: 'Tool 2' },
        { name: 'tool3', description: 'Tool 3' },
      ]);
    });

    it('returns empty array when no tools', () => {
      const allTools = useAIMCPServersStore.getState().getAllToolSummaries();
      expect(allTools).toEqual([]);
    });
  });

  describe('setConfigurations', () => {
    it('sets configurations and removes unregistered servers', () => {
      const transport1 = { type: 'sse' as const, url: 'http://localhost:3030/mcp' };
      const transport2 = { type: 'sse' as const, url: 'http://localhost:3031/mcp' };

      // Register two servers
      useAIMCPServersStore.getState().registerServer({
        id: 'server1',
        transport: transport1,
        configSignature: JSON.stringify({ name: null, transport: transport1 }),
      });

      useAIMCPServersStore.getState().registerServer({
        id: 'server2',
        transport: transport2,
        configSignature: JSON.stringify({ name: null, transport: transport2 }),
      });

      // Set configurations to only include server1
      const newConfigs: SerializedMCPServer[] = [
        { id: 'server1', transport: transport1 },
      ];

      useAIMCPServersStore.getState().setConfigurations(newConfigs);

      const state = useAIMCPServersStore.getState();
      expect(state.configurations).toEqual(newConfigs);
      expect(state.servers.has('server1')).toBe(true);
      expect(state.servers.has('server2')).toBe(false);
    });
  });

  describe('addOrUpdateConfiguration', () => {
    it('adds a new configuration', () => {
      const config: SerializedMCPServer = {
        id: 'server1',
        name: 'Server 1',
        transport: { type: 'sse', url: 'http://localhost:3030/mcp' },
      };

      useAIMCPServersStore.getState().addOrUpdateConfiguration(config);

      const configs = useAIMCPServersStore.getState().configurations;
      expect(configs).toHaveLength(1);
      expect(configs[0]).toEqual(config);
    });

    it('updates an existing configuration', () => {
      const config1: SerializedMCPServer = {
        id: 'server1',
        name: 'Server 1',
        transport: { type: 'sse', url: 'http://localhost:3030/mcp' },
      };

      const config2: SerializedMCPServer = {
        id: 'server1',
        name: 'Server 1 Updated',
        transport: { type: 'sse', url: 'http://localhost:3040/mcp' },
      };

      useAIMCPServersStore.getState().addOrUpdateConfiguration(config1);
      useAIMCPServersStore.getState().addOrUpdateConfiguration(config2);

      const configs = useAIMCPServersStore.getState().configurations;
      expect(configs).toHaveLength(1);
      expect(configs[0]).toEqual(config2);
    });
  });

  describe('removeConfiguration', () => {
    it('removes a configuration and its server entry', () => {
      const transport = { type: 'sse' as const, url: 'http://localhost:3030/mcp' };

      useAIMCPServersStore.getState().registerServer({
        id: 'server1',
        transport,
        configSignature: JSON.stringify({ name: null, transport }),
      });

      expect(useAIMCPServersStore.getState().configurations).toHaveLength(1);
      expect(useAIMCPServersStore.getState().servers.has('server1')).toBe(true);

      useAIMCPServersStore.getState().removeConfiguration('server1');

      expect(useAIMCPServersStore.getState().configurations).toHaveLength(0);
      expect(useAIMCPServersStore.getState().servers.has('server1')).toBe(false);
    });
  });

  describe('setDefaultApi', () => {
    it('sets the default API endpoint', () => {
      useAIMCPServersStore.getState().setDefaultApi('/custom/mcp');
      expect(useAIMCPServersStore.getState().defaultApi).toBe('/custom/mcp');
    });
  });

  describe('setEnabled', () => {
    it('sets the enabled flag', () => {
      expect(useAIMCPServersStore.getState().enabled).toBe(false);

      useAIMCPServersStore.getState().setEnabled(true);
      expect(useAIMCPServersStore.getState().enabled).toBe(true);

      useAIMCPServersStore.getState().setEnabled(false);
      expect(useAIMCPServersStore.getState().enabled).toBe(false);
    });
  });

  describe('getServersAsStableObject', () => {
    it('converts Map to stable object', () => {
      const transport = { type: 'sse' as const, url: 'http://localhost:3030/mcp' };

      useAIMCPServersStore.getState().registerServer({
        id: 'server1',
        name: 'Server 1',
        transport,
        configSignature: JSON.stringify({ name: 'Server 1', transport }),
      });

      const serversObject = useAIMCPServersStore.getState().getServersAsStableObject();

      expect(Object.keys(serversObject)).toEqual(['server1']);
      expect(serversObject['server1']).toMatchObject({
        id: 'server1',
        name: 'Server 1',
      });
    });

    it('returns empty object when no servers', () => {
      const serversObject = useAIMCPServersStore.getState().getServersAsStableObject();
      expect(serversObject).toEqual({});
    });
  });
});
