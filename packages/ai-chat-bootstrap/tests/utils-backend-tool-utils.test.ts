import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deserializeFrontendTools, loadMcpTools } from '../lib/utils/backend-tool-utils';
import type { SerializedMCPServer } from '../lib/stores/mcp';

// Mock the AI SDK and MCP SDK
const mockExperimentalCreateMCPClient = vi.hoisted(() => vi.fn());

vi.mock('ai', async () => {
  const actual = await vi.importActual<any>('ai');
  return {
    ...actual,
    experimental_createMCPClient: mockExperimentalCreateMCPClient,
  };
});

describe('deserializeFrontendTools', () => {
  it('returns empty record when input is empty or null', () => {
    expect(deserializeFrontendTools()).toEqual({});
    // @ts-expect-error Testing null input for error handling
    expect(deserializeFrontendTools(null)).toEqual({});
    expect(deserializeFrontendTools([])).toEqual({});
  });

  it('creates backend tool definitions keyed by name', () => {
    const tools = deserializeFrontendTools([
      {
        name: 'sum',
        description: 'add two',
        inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'] },
      },
    ] as any);
    expect(Object.keys(tools)).toEqual(['sum']);
    expect(tools['sum']).toBeTruthy();
  });
});

describe('loadMcpTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockExperimentalCreateMCPClient.mockReset();
  });

  it('returns empty result when no servers provided', async () => {
    const result = await loadMcpTools();
    expect(result).toEqual({
      tools: {},
      toolSummaries: [],
      errors: [],
    });
  });

  it('returns empty result when servers array is empty', async () => {
    const result = await loadMcpTools([]);
    expect(result).toEqual({
      tools: {},
      toolSummaries: [],
      errors: [],
    });
  });

  it('loads tools from a single MCP server', async () => {
    const mockClient = {
      tools: vi.fn().mockResolvedValue({
        'weather_get': {
          description: 'Get weather forecast',
          inputSchema: { type: 'object' },
        },
        'weather_current': {
          description: 'Get current weather',
          inputSchema: { type: 'object' },
        },
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockExperimentalCreateMCPClient.mockResolvedValue(mockClient);

    const servers: SerializedMCPServer[] = [
      {
        id: 'weather-server',
        name: 'Weather Server',
        transport: {
          type: 'sse',
          url: 'http://localhost:3030/mcp',
        },
      },
    ];

    const result = await loadMcpTools(servers);

    expect(result.tools).toHaveProperty('weather_get');
    expect(result.tools).toHaveProperty('weather_current');
    expect(result.toolSummaries).toHaveLength(2);
    expect(result.toolSummaries).toContainEqual({
      name: 'weather_get',
      description: 'Get weather forecast',
    });
    expect(result.toolSummaries).toContainEqual({
      name: 'weather_current',
      description: 'Get current weather',
    });
    expect(result.errors).toEqual([]);
  });

  it('loads tools from multiple MCP servers', async () => {
    const mockClient1 = {
      tools: vi.fn().mockResolvedValue({
        'tool1': { description: 'Tool 1' },
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    const mockClient2 = {
      tools: vi.fn().mockResolvedValue({
        'tool2': { description: 'Tool 2' },
        'tool3': { description: 'Tool 3' },
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockExperimentalCreateMCPClient
      .mockResolvedValueOnce(mockClient1)
      .mockResolvedValueOnce(mockClient2);

    const servers: SerializedMCPServer[] = [
      {
        id: 'server1',
        transport: { type: 'sse', url: 'http://localhost:3030/mcp' },
      },
      {
        id: 'server2',
        transport: { type: 'sse', url: 'http://localhost:3031/mcp' },
      },
    ];

    const result = await loadMcpTools(servers);

    expect(Object.keys(result.tools)).toHaveLength(3);
    expect(result.toolSummaries).toHaveLength(3);
    expect(result.errors).toEqual([]);
  });

  it('handles server connection failure gracefully', async () => {
    mockExperimentalCreateMCPClient.mockRejectedValue(
      new Error('Connection refused')
    );

    const servers: SerializedMCPServer[] = [
      {
        id: 'failing-server',
        name: 'Failing Server',
        transport: { type: 'sse', url: 'http://localhost:9999/mcp' },
      },
    ];

    const result = await loadMcpTools(servers);

    expect(result.tools).toEqual({});
    expect(result.toolSummaries).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      serverId: 'failing-server',
      serverName: 'Failing Server',
      url: 'http://localhost:9999/mcp',
      message: 'Connection refused',
    });
  });

  it('continues loading from other servers when one fails', async () => {
    const mockSuccessClient = {
      tools: vi.fn().mockResolvedValue({
        'success_tool': { description: 'Success' },
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockExperimentalCreateMCPClient
      .mockRejectedValueOnce(new Error('Server 1 failed'))
      .mockResolvedValueOnce(mockSuccessClient);

    const servers: SerializedMCPServer[] = [
      {
        id: 'failing-server',
        transport: { type: 'sse', url: 'http://localhost:9999/mcp' },
      },
      {
        id: 'success-server',
        transport: { type: 'sse', url: 'http://localhost:3030/mcp' },
      },
    ];

    const result = await loadMcpTools(servers);

    expect(result.tools).toHaveProperty('success_tool');
    expect(result.toolSummaries).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].serverId).toBe('failing-server');
  });

  it('handles tools without descriptions', async () => {
    const mockClient = {
      tools: vi.fn().mockResolvedValue({
        'tool_no_desc': {},
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockExperimentalCreateMCPClient.mockResolvedValueOnce(mockClient);

    const servers: SerializedMCPServer[] = [
      {
        id: 'server-no-desc',
        transport: { type: 'sse', url: 'http://localhost:3033/mcp' },
      },
    ];

    const result = await loadMcpTools(servers);

    expect(result.toolSummaries).toContainEqual({
      name: 'tool_no_desc',
      description: undefined,
    });
  });

  it('handles non-Error exceptions from MCP server', async () => {
    mockExperimentalCreateMCPClient.mockRejectedValue('String error');

    const servers: SerializedMCPServer[] = [
      {
        id: 'server1',
        name: 'Server 1',
        transport: { type: 'sse', url: 'http://localhost:3030/mcp' },
      },
    ];

    const result = await loadMcpTools(servers);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toBe('An unknown error occurred');
  });

  it('handles empty tool set from server', async () => {
    const mockClient = {
      tools: vi.fn().mockResolvedValue({}),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockExperimentalCreateMCPClient.mockResolvedValue(mockClient);

    const servers: SerializedMCPServer[] = [
      {
        id: 'empty-server',
        transport: { type: 'sse', url: 'http://localhost:3030/mcp' },
      },
    ];

    const result = await loadMcpTools(servers);

    expect(result.tools).toEqual({});
    expect(result.toolSummaries).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it('passes transport headers to client', async () => {
    const mockClient = {
      tools: vi.fn().mockResolvedValue({}),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockExperimentalCreateMCPClient.mockResolvedValue(mockClient);

    const servers: SerializedMCPServer[] = [
      {
        id: 'server1',
        transport: {
          type: 'sse',
          url: 'http://localhost:3030/mcp',
          headers: {
            'authorization': 'Bearer token123',
            'x-custom': 'value',
          },
        },
      },
    ];

    await loadMcpTools(servers);

    expect(mockExperimentalCreateMCPClient).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: expect.any(Object),
      })
    );
  });

  it('uses streamable-http transport when specified', async () => {
    const mockClient = {
      tools: vi.fn().mockResolvedValue({}),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockExperimentalCreateMCPClient.mockResolvedValue(mockClient);

    const servers: SerializedMCPServer[] = [
      {
        id: 'http-server',
        transport: {
          type: 'streamable-http',
          url: 'http://localhost:3030/mcp',
        },
      },
    ];

    await loadMcpTools(servers);

    expect(mockExperimentalCreateMCPClient).toHaveBeenCalled();
  });
});

