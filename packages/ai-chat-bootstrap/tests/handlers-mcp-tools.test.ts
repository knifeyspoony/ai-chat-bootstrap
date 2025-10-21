import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MCPServerToolsRequest, MCPServerToolsResponse } from '../lib/stores/mcp';
import type { LoadMcpToolsResult } from '../lib/utils/backend-tool-utils';

// Mock the backend-tool-utils module
const loadMcpToolsMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/utils/backend-tool-utils', async () => {
  const actual = await vi.importActual<any>('../lib/utils/backend-tool-utils');
  return {
    ...actual,
    loadMcpTools: loadMcpToolsMock,
  };
});

import { createMcpToolsHandler } from '../lib/handlers/create-mcp-tools-handler';

describe('createMcpToolsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    loadMcpToolsMock.mockReset();
  });

  describe('request validation', () => {
    it('returns 400 for invalid JSON', async () => {
      const handler = createMcpToolsHandler();
      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      });

      const response = await handler(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: 'Invalid JSON body' });
    });

    it('returns 400 when server descriptor is missing', async () => {
      const handler = createMcpToolsHandler();
      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await handler(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: 'Missing server descriptor' });
    });

    it('returns 400 when server is null', async () => {
      const handler = createMcpToolsHandler();
      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server: null }),
      });

      const response = await handler(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({ error: 'Missing server descriptor' });
    });
  });

  describe('successful tool loading', () => {
    it('loads and returns MCP tools', async () => {
      const mockResult: LoadMcpToolsResult = {
        tools: { testTool: { description: 'A test tool' } as any },
        toolSummaries: [
          { name: 'testTool', description: 'A test tool' },
          { name: 'anotherTool', description: 'Another tool' },
        ],
        errors: [],
      };

      loadMcpToolsMock.mockResolvedValue(mockResult);

      const handler = createMcpToolsHandler();
      const requestBody: MCPServerToolsRequest = {
        server: {
          id: 'test-server',
          name: 'Test Server',
          transport: {
            type: 'sse',
            url: 'http://localhost:3030/mcp',
          },
        },
      };

      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await handler(req);
      const body: MCPServerToolsResponse = await response.json();

      expect(response.status).toBe(200);
      expect(body.tools).toEqual(mockResult.toolSummaries);
      expect(body.errors).toBeUndefined();
      expect(loadMcpToolsMock).toHaveBeenCalledWith([requestBody.server]);
    });

    it('returns 207 with partial errors', async () => {
      const mockResult: LoadMcpToolsResult = {
        tools: { successTool: { description: 'Success' } as any },
        toolSummaries: [{ name: 'successTool', description: 'Success' }],
        errors: [
          {
            serverId: 'test-server',
            serverName: 'Test Server',
            url: 'http://localhost:3030/mcp',
            message: 'Some tools failed to load',
          },
        ],
      };

      loadMcpToolsMock.mockResolvedValue(mockResult);

      const handler = createMcpToolsHandler();
      const requestBody: MCPServerToolsRequest = {
        server: {
          id: 'test-server',
          transport: { type: 'sse', url: 'http://localhost:3030/mcp' },
        },
      };

      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await handler(req);
      const body: MCPServerToolsResponse = await response.json();

      expect(response.status).toBe(207); // Multi-status
      expect(body.tools).toEqual(mockResult.toolSummaries);
      expect(body.errors).toHaveLength(1);
      expect(body.errors?.[0].message).toBe('Some tools failed to load');
    });

    it('handles empty tool list', async () => {
      const mockResult: LoadMcpToolsResult = {
        tools: {},
        toolSummaries: [],
        errors: [],
      };

      loadMcpToolsMock.mockResolvedValue(mockResult);

      const handler = createMcpToolsHandler();
      const requestBody: MCPServerToolsRequest = {
        server: {
          id: 'test-server',
          transport: { type: 'sse', url: 'http://localhost:3030/mcp' },
        },
      };

      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await handler(req);
      const body: MCPServerToolsResponse = await response.json();

      expect(response.status).toBe(200);
      expect(body.tools).toEqual([]);
    });
  });

  describe('header forwarding', () => {
    it('forwards specified headers to MCP server', async () => {
      const mockResult: LoadMcpToolsResult = {
        tools: {},
        toolSummaries: [],
        errors: [],
      };

      loadMcpToolsMock.mockResolvedValue(mockResult);

      const handler = createMcpToolsHandler({
        forwardHeaders: ['authorization', 'x-custom-header'],
      });

      const requestBody: MCPServerToolsRequest = {
        server: {
          id: 'test-server',
          transport: {
            type: 'sse',
            url: 'http://localhost:3030/mcp',
            headers: { 'x-client-header': 'client-value' },
          },
        },
      };

      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer token123',
          'x-custom-header': 'custom-value',
          'x-ignore-header': 'ignored',
        },
        body: JSON.stringify(requestBody),
      });

      await handler(req);

      expect(loadMcpToolsMock).toHaveBeenCalledWith([
        expect.objectContaining({
          transport: expect.objectContaining({
            headers: {
              'x-client-header': 'client-value',
              'authorization': 'Bearer token123',
              'x-custom-header': 'custom-value',
            },
          }),
        }),
      ]);
    });

    it('does not forward headers when forwardHeaders is not specified', async () => {
      const mockResult: LoadMcpToolsResult = {
        tools: {},
        toolSummaries: [],
        errors: [],
      };

      loadMcpToolsMock.mockResolvedValue(mockResult);

      const handler = createMcpToolsHandler();

      const requestBody: MCPServerToolsRequest = {
        server: {
          id: 'test-server',
          transport: {
            type: 'sse',
            url: 'http://localhost:3030/mcp',
            headers: { 'x-client-header': 'value' },
          },
        },
      };

      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer token123',
        },
        body: JSON.stringify(requestBody),
      });

      await handler(req);

      expect(loadMcpToolsMock).toHaveBeenCalledWith([
        expect.objectContaining({
          transport: expect.objectContaining({
            headers: { 'x-client-header': 'value' },
          }),
        }),
      ]);
    });

    it('prioritizes forwarded headers over client headers', async () => {
      const mockResult: LoadMcpToolsResult = {
        tools: {},
        toolSummaries: [],
        errors: [],
      };

      loadMcpToolsMock.mockResolvedValue(mockResult);

      const handler = createMcpToolsHandler({
        forwardHeaders: ['authorization'],
      });

      const requestBody: MCPServerToolsRequest = {
        server: {
          id: 'test-server',
          transport: {
            type: 'sse',
            url: 'http://localhost:3030/mcp',
            headers: { 'authorization': 'old-token' },
          },
        },
      };

      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer new-token',
        },
        body: JSON.stringify(requestBody),
      });

      await handler(req);

      expect(loadMcpToolsMock).toHaveBeenCalledWith([
        expect.objectContaining({
          transport: expect.objectContaining({
            headers: { 'authorization': 'Bearer new-token' },
          }),
        }),
      ]);
    });

    it('handles missing forwarded headers gracefully', async () => {
      const mockResult: LoadMcpToolsResult = {
        tools: {},
        toolSummaries: [],
        errors: [],
      };

      loadMcpToolsMock.mockResolvedValue(mockResult);

      const handler = createMcpToolsHandler({
        forwardHeaders: ['authorization', 'x-missing'],
      });

      const requestBody: MCPServerToolsRequest = {
        server: {
          id: 'test-server',
          transport: { type: 'sse', url: 'http://localhost:3030/mcp' },
        },
      };

      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer token',
        },
        body: JSON.stringify(requestBody),
      });

      await handler(req);

      expect(loadMcpToolsMock).toHaveBeenCalledWith([
        expect.objectContaining({
          transport: expect.objectContaining({
            headers: { 'authorization': 'Bearer token' },
          }),
        }),
      ]);
    });
  });

  describe('error handling', () => {
    it('returns 500 when loadMcpTools throws', async () => {
      loadMcpToolsMock.mockRejectedValue(new Error('Connection failed'));

      const handler = createMcpToolsHandler();
      const requestBody: MCPServerToolsRequest = {
        server: {
          id: 'test-server',
          transport: { type: 'sse', url: 'http://localhost:3030/mcp' },
        },
      };

      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await handler(req);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({ error: 'Connection failed' });
    });

    it('handles non-Error exceptions', async () => {
      loadMcpToolsMock.mockRejectedValue('String error');

      const handler = createMcpToolsHandler();
      const requestBody: MCPServerToolsRequest = {
        server: {
          id: 'test-server',
          transport: { type: 'sse', url: 'http://localhost:3030/mcp' },
        },
      };

      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await handler(req);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({ error: 'Failed to load MCP tools' });
    });

    it('calls onError callback on request parsing error', async () => {
      const onError = vi.fn();
      const handler = createMcpToolsHandler({ onError });

      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      await handler(req);

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ req })
      );
    });

    it('calls onError callback on loadMcpTools error', async () => {
      const testError = new Error('Test error');
      loadMcpToolsMock.mockRejectedValue(testError);

      const onError = vi.fn();
      const handler = createMcpToolsHandler({ onError });

      const requestBody: MCPServerToolsRequest = {
        server: {
          id: 'test-server',
          transport: { type: 'sse', url: 'http://localhost:3030/mcp' },
        },
      };

      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      await handler(req);

      expect(onError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({ req })
      );
    });
  });

  describe('transport types', () => {
    it('handles SSE transport type', async () => {
      const mockResult: LoadMcpToolsResult = {
        tools: {},
        toolSummaries: [{ name: 'sse-tool', description: 'SSE tool' }],
        errors: [],
      };

      loadMcpToolsMock.mockResolvedValue(mockResult);

      const handler = createMcpToolsHandler();
      const requestBody: MCPServerToolsRequest = {
        server: {
          id: 'sse-server',
          transport: {
            type: 'sse',
            url: 'http://localhost:3030/mcp',
          },
        },
      };

      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await handler(req);

      expect(response.status).toBe(200);
      expect(loadMcpToolsMock).toHaveBeenCalledWith([
        expect.objectContaining({
          transport: expect.objectContaining({ type: 'sse' }),
        }),
      ]);
    });

    it('handles streamable-http transport type', async () => {
      const mockResult: LoadMcpToolsResult = {
        tools: {},
        toolSummaries: [{ name: 'http-tool', description: 'HTTP tool' }],
        errors: [],
      };

      loadMcpToolsMock.mockResolvedValue(mockResult);

      const handler = createMcpToolsHandler();
      const requestBody: MCPServerToolsRequest = {
        server: {
          id: 'http-server',
          transport: {
            type: 'streamable-http',
            url: 'http://localhost:3030/mcp',
          },
        },
      };

      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await handler(req);

      expect(response.status).toBe(200);
      expect(loadMcpToolsMock).toHaveBeenCalledWith([
        expect.objectContaining({
          transport: expect.objectContaining({ type: 'streamable-http' }),
        }),
      ]);
    });
  });

  describe('response format', () => {
    it('returns proper JSON content-type header', async () => {
      const mockResult: LoadMcpToolsResult = {
        tools: {},
        toolSummaries: [],
        errors: [],
      };

      loadMcpToolsMock.mockResolvedValue(mockResult);

      const handler = createMcpToolsHandler();
      const requestBody: MCPServerToolsRequest = {
        server: {
          id: 'test-server',
          transport: { type: 'sse', url: 'http://localhost:3030/mcp' },
        },
      };

      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await handler(req);

      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('includes server metadata in request to loadMcpTools', async () => {
      const mockResult: LoadMcpToolsResult = {
        tools: {},
        toolSummaries: [],
        errors: [],
      };

      loadMcpToolsMock.mockResolvedValue(mockResult);

      const handler = createMcpToolsHandler();
      const requestBody: MCPServerToolsRequest = {
        server: {
          id: 'my-server',
          name: 'My Test Server',
          transport: {
            type: 'sse',
            url: 'http://localhost:3030/mcp',
            headers: { 'x-custom': 'value' },
          },
        },
      };

      const req = new Request('http://test/api/mcp-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      await handler(req);

      expect(loadMcpToolsMock).toHaveBeenCalledWith([
        {
          id: 'my-server',
          name: 'My Test Server',
          transport: {
            type: 'sse',
            url: 'http://localhost:3030/mcp',
            headers: { 'x-custom': 'value' },
          },
        },
      ]);
    });
  });
});
