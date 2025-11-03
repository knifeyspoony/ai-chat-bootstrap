/**
 * MCP client lifecycle management
 */

import { experimental_createMCPClient } from 'ai';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { EventSourceInitDict } from 'eventsource';

import type { MCPServerTransport, SerializedMCPServer } from '../stores/mcp';
import { ClientState, CircuitBreaker, ClientHealthMonitor } from './mcp-health';
import { MCPErrorAdapter } from './mcp-errors';
import { RetryExecutor } from './mcp-retry';

type ExperimentalMcpClient = Awaited<
  ReturnType<typeof experimental_createMCPClient>
>;

/**
 * Entry for a cached client with full lifecycle tracking
 */
export interface ManagedClientEntry {
  /** Promise resolving to the client */
  client: Promise<ExperimentalMcpClient>;
  /** Current client state */
  state: ClientState;
  /** Configuration signature for cache validation */
  signature: string;
  /** When the client was created */
  createdAt: number;
  /** When the client was last used */
  lastUsedAt: number;
  /** When the last health check was performed */
  lastHealthCheck: number;
  /** Circuit breaker for this client */
  circuitBreaker: CircuitBreaker;
  /** Number of consecutive errors */
  errorCount: number;
}

/**
 * Configuration for client manager
 */
export interface ClientManagerConfig {
  /** Maximum age of client before refresh (ms) */
  maxClientAge: number;
  /** Maximum idle time before closing (ms) */
  maxIdleTime: number;
  /** Health check interval (ms) */
  healthCheckInterval: number;
}

/**
 * Manages MCP client lifecycle including creation, health, and cleanup
 */
export class MCPClientManager {
  private clients: Map<string, ManagedClientEntry> = new Map();
  private healthMonitor: ClientHealthMonitor = new ClientHealthMonitor();
  private retryExecutor: RetryExecutor = new RetryExecutor();

  constructor(
    private readonly config: ClientManagerConfig = {
      maxClientAge: 5 * 60 * 1000, // 5 minutes
      maxIdleTime: 2 * 60 * 1000, // 2 minutes
      healthCheckInterval: 30 * 1000, // 30 seconds
    }
  ) {}

  /**
   * Get or create a client for a server
   */
  async getClient(server: SerializedMCPServer): Promise<ExperimentalMcpClient> {
    const signature = this.createSignature(server);
    const existing = this.clients.get(server.id);

    // Check if we can reuse existing client
    if (existing && existing.signature === signature) {
      // Check if client is stale
      if (this.isClientStale(existing)) {
        await this.closeClient(server.id);
      } else {
        // Update last used time
        existing.lastUsedAt = Date.now();

        // Return existing client through circuit breaker
        return existing.circuitBreaker.execute(async () => {
          try {
            const client = await existing.client;
            existing.state = ClientState.READY;
            existing.errorCount = 0;
            return client;
          } catch (error) {
            existing.state = ClientState.ERROR;
            existing.errorCount++;
            throw MCPErrorAdapter.fromSDKError(error, { serverId: server.id });
          }
        });
      }
    }

    // Close old client if signature changed
    if (existing) {
      await this.closeClient(server.id);
    }

    // Create new client
    return this.createClient(server, signature);
  }

  /**
   * Create a new client
   */
  private async createClient(
    server: SerializedMCPServer,
    signature: string
  ): Promise<ExperimentalMcpClient> {
    const entry: ManagedClientEntry = {
      client: this.retryExecutor.execute(
        () => this.doCreateClient(server),
        { serverId: server.id, operation: 'createClient' }
      ),
      state: ClientState.CONNECTING,
      signature,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      lastHealthCheck: 0,
      circuitBreaker: new CircuitBreaker(),
      errorCount: 0,
    };

    this.clients.set(server.id, entry);

    try {
      const client = await entry.client;
      entry.state = ClientState.READY;
      return client;
    } catch (error) {
      entry.state = ClientState.ERROR;
      this.clients.delete(server.id);
      throw error;
    }
  }

  /**
   * Actually create the MCP client
   */
  private async doCreateClient(
    server: SerializedMCPServer
  ): Promise<ExperimentalMcpClient> {
    const transport = this.createTransport(server.transport);

    return experimental_createMCPClient({
      name: server.name,
      transport,
    });
  }

  /**
   * Create transport for server
   */
  private createTransport(config: MCPServerTransport) {
    const url = new URL(config.url);

    if (config.type === 'sse') {
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

    if (config.type === 'streamable-http') {
      return new StreamableHTTPClientTransport(url, {
        requestInit: config.headers
          ? { headers: { ...config.headers } }
          : undefined,
      });
    }

    throw new Error(`Unsupported MCP transport type`);
  }

  /**
   * Close a specific client
   */
  async closeClient(serverId: string): Promise<void> {
    const entry = this.clients.get(serverId);
    if (!entry) return;

    entry.state = ClientState.CLOSING;

    try {
      const client = await entry.client;
      await this.shutdownClient(client);
    } catch (error) {
      // Ignore errors during shutdown
      console.warn('[acb][mcp] Error closing client', { serverId, error });
    } finally {
      entry.state = ClientState.CLOSED;
      this.clients.delete(serverId);
      this.healthMonitor.clearHealthStatus(serverId);
    }
  }

  /**
   * Shutdown client gracefully
   */
  private async shutdownClient(client: ExperimentalMcpClient): Promise<void> {
    const maybeClientWithNotifications = client as {
      notification?: (notification: { method: string }) => Promise<void>;
      close: () => Promise<void>;
    };

    // Best effort shutdown notification
    if (typeof maybeClientWithNotifications.notification === 'function') {
      for (const method of ['shutdown', 'notifications/shutdown']) {
        try {
          await maybeClientWithNotifications.notification({ method });
        } catch {
          // Ignore notification failures
        }
      }
    }

    // Close the client
    await client.close().catch(() => {
      // Ignore close errors
    });
  }

  /**
   * Check if client is stale and should be refreshed
   */
  private isClientStale(entry: ManagedClientEntry): boolean {
    const age = Date.now() - entry.createdAt;
    const idleTime = Date.now() - entry.lastUsedAt;

    return (
      age > this.config.maxClientAge ||
      idleTime > this.config.maxIdleTime ||
      entry.state === ClientState.ERROR ||
      entry.state === ClientState.DEGRADED
    );
  }

  /**
   * Perform health check on a client
   */
  async performHealthCheck(serverId: string): Promise<void> {
    const entry = this.clients.get(serverId);
    if (!entry) return;

    // Skip if recently checked
    if (Date.now() - entry.lastHealthCheck < this.config.healthCheckInterval) {
      return;
    }

    try {
      await this.healthMonitor.checkHealth(serverId, async () => {
        const client = await entry.client;
        // Could add a ping or lightweight operation here
        // For now, just verify client is accessible
        if (!client) {
          throw new Error('Client is null');
        }
      });

      entry.lastHealthCheck = Date.now();
      if (entry.state === ClientState.DEGRADED) {
        entry.state = ClientState.READY;
      }
    } catch (error) {
      entry.state = ClientState.DEGRADED;
      console.warn('[acb][mcp] Health check failed', { serverId, error });
    }
  }

  /**
   * Close all clients
   */
  async closeAll(): Promise<void> {
    const serverIds = Array.from(this.clients.keys());
    await Promise.all(serverIds.map(id => this.closeClient(id)));
  }

  /**
   * Get client state
   */
  getClientState(serverId: string): ClientState | undefined {
    return this.clients.get(serverId)?.state;
  }

  /**
   * Create configuration signature for cache validation
   */
  private createSignature(server: SerializedMCPServer): string {
    return JSON.stringify({
      name: server.name ?? null,
      transport: {
        type: server.transport.type,
        url: server.transport.url,
        headers: this.canonicalizeHeaders(server.transport.headers),
      },
    });
  }

  /**
   * Canonicalize headers for consistent comparison
   */
  private canonicalizeHeaders(headers?: Record<string, string>) {
    if (!headers) return undefined;
    return Object.fromEntries(
      Object.entries(headers).sort(([a], [b]) => a.localeCompare(b))
    );
  }
}
