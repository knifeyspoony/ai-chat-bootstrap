/**
 * Health monitoring and circuit breaker for MCP clients
 */

import { MCPError, MCPErrorAdapter, MCPCircuitBreakerOpenError } from './mcp-errors';

/**
 * Client state machine
 */
export enum ClientState {
  /** Client is being created */
  CONNECTING = 'CONNECTING',
  /** Client is ready to use */
  READY = 'READY',
  /** Client is idle (not recently used) */
  IDLE = 'IDLE',
  /** Client is experiencing errors but not dead */
  DEGRADED = 'DEGRADED',
  /** Client is being closed */
  CLOSING = 'CLOSING',
  /** Client is closed */
  CLOSED = 'CLOSED',
  /** Client is in error state */
  ERROR = 'ERROR',
}

/**
 * Health status of a client
 */
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: number;
  latency?: number;
  error?: MCPError;
}

/**
 * Circuit breaker states
 */
export enum CircuitState {
  /** Circuit is closed, requests flow normally */
  CLOSED = 'CLOSED',
  /** Circuit is open, requests are rejected */
  OPEN = 'OPEN',
  /** Circuit is testing if service has recovered */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before attempting to close circuit */
  resetTimeout: number;
  /** Number of successful requests needed to close circuit from half-open */
  successThreshold: number;
}

/**
 * Circuit breaker pattern implementation.
 * Prevents cascading failures by failing fast when a service is degraded.
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;

  constructor(
    private readonly config: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      successThreshold: 2,
    }
  ) {}

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new MCPCircuitBreakerOpenError(
          'Circuit breaker is open, service is degraded',
          undefined,
          {
            nextAttemptTime: this.nextAttemptTime,
            failureCount: this.failureCount,
          }
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      const mcpError = MCPErrorAdapter.fromSDKError(error);
      this.onFailure(mcpError);
      throw mcpError;
    }
  }

  /**
   * Check if circuit should attempt to reset
   */
  private shouldAttemptReset(): boolean {
    return Date.now() >= this.nextAttemptTime;
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(error: MCPError): void {
    this.lastFailureTime = Date.now();

    // Only trip circuit for certain error types
    if (!MCPErrorAdapter.shouldTripCircuitBreaker(error)) {
      return;
    }

    this.failureCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed during test, go back to open
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
      this.successCount = 0;
    } else if (this.failureCount >= this.config.failureThreshold) {
      // Too many failures, open circuit
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Manually reset circuit (for testing/recovery)
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
  }
}

/**
 * Health monitor for MCP clients
 */
export class ClientHealthMonitor {
  private healthStatus: Map<string, HealthStatus> = new Map();

  /**
   * Perform health check on a client.
   * This is a lightweight check to verify the client is responsive.
   */
  async checkHealth(
    clientId: string,
    healthCheck: () => Promise<void>
  ): Promise<HealthStatus> {
    const start = Date.now();

    try {
      await healthCheck();

      const status: HealthStatus = {
        status: 'healthy',
        latency: Date.now() - start,
        lastCheck: Date.now(),
      };

      this.healthStatus.set(clientId, status);
      return status;
    } catch (error) {
      const mcpError = MCPErrorAdapter.fromSDKError(error);

      const status: HealthStatus = {
        status: 'unhealthy',
        lastCheck: Date.now(),
        error: mcpError,
      };

      this.healthStatus.set(clientId, status);
      return status;
    }
  }

  /**
   * Get last known health status
   */
  getHealthStatus(clientId: string): HealthStatus | undefined {
    return this.healthStatus.get(clientId);
  }

  /**
   * Check if health status is stale
   */
  isHealthStatusStale(
    clientId: string,
    maxAge: number = 30000 // 30 seconds
  ): boolean {
    const status = this.healthStatus.get(clientId);
    if (!status) return true;

    return Date.now() - status.lastCheck > maxAge;
  }

  /**
   * Clear health status for a client
   */
  clearHealthStatus(clientId: string): void {
    this.healthStatus.delete(clientId);
  }

  /**
   * Clear all health statuses
   */
  clearAll(): void {
    this.healthStatus.clear();
  }
}
