/**
 * Configurable retry strategies for MCP operations.
 */

import { MCPError, MCPErrorAdapter } from './mcp-errors';

/**
 * Interface for retry strategy implementations
 */
export interface RetryStrategy {
  /**
   * Determine if operation should be retried
   */
  shouldRetry(error: MCPError, attempt: number): boolean;

  /**
   * Calculate delay before next retry attempt
   */
  getDelay(attempt: number): number;

  /**
   * Get maximum number of retry attempts
   */
  getMaxAttempts(): number;
}

/**
 * Exponential backoff retry strategy with jitter.
 * Delays increase exponentially: baseDelay * 2^attempt
 */
export class ExponentialBackoffStrategy implements RetryStrategy {
  constructor(
    private readonly baseDelay: number = 100,
    private readonly maxDelay: number = 5000,
    private readonly maxAttempts: number = 3,
    private readonly jitter: boolean = true
  ) {}

  shouldRetry(error: MCPError, attempt: number): boolean {
    return MCPErrorAdapter.isRetryable(error) && attempt < this.maxAttempts;
  }

  getDelay(attempt: number): number {
    // Calculate exponential delay
    const exponential = Math.min(
      this.baseDelay * Math.pow(2, attempt),
      this.maxDelay
    );

    // Add jitter to prevent thundering herd
    if (this.jitter) {
      // Random value between 50% and 100% of exponential delay
      return Math.floor(exponential * (0.5 + Math.random() * 0.5));
    }

    return exponential;
  }

  getMaxAttempts(): number {
    return this.maxAttempts;
  }
}

/**
 * Fixed delay retry strategy (constant backoff)
 */
export class FixedDelayStrategy implements RetryStrategy {
  constructor(
    private readonly delay: number = 1000,
    private readonly maxAttempts: number = 3
  ) {}

  shouldRetry(error: MCPError, attempt: number): boolean {
    return MCPErrorAdapter.isRetryable(error) && attempt < this.maxAttempts;
  }

  getDelay(): number {
    return this.delay;
  }

  getMaxAttempts(): number {
    return this.maxAttempts;
  }
}

/**
 * No retry strategy (fail immediately)
 */
export class NoRetryStrategy implements RetryStrategy {
  shouldRetry(): boolean {
    return false;
  }

  getDelay(): number {
    return 0;
  }

  getMaxAttempts(): number {
    return 0;
  }
}

/**
 * Context for retry execution
 */
export interface RetryContext {
  serverId?: string;
  operation?: string;
  [key: string]: unknown;
}

/**
 * Executes operations with configurable retry logic
 */
export class RetryExecutor {
  constructor(private readonly strategy: RetryStrategy = new ExponentialBackoffStrategy()) {}

  /**
   * Execute operation with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    context?: RetryContext
  ): Promise<T> {
    let lastError: MCPError | undefined;
    const maxAttempts = this.strategy.getMaxAttempts();

    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        // Convert to our error type
        const mcpError = MCPErrorAdapter.fromSDKError(error, context);
        lastError = mcpError;

        // Check if we should retry
        if (!this.strategy.shouldRetry(mcpError, attempt)) {
          throw mcpError;
        }

        // Last attempt exhausted
        if (attempt === maxAttempts) {
          throw mcpError;
        }

        // Calculate delay and wait
        const delay = this.strategy.getDelay(attempt);

        // Log retry attempt
        console.warn(
          `[acb][mcp] Retry attempt ${attempt + 1}/${maxAttempts} ` +
          `after ${delay}ms` +
          (context?.serverId ? ` for ${context.serverId}` : ''),
          { error: mcpError.message, code: mcpError.code }
        );

        await this.sleep(delay);
      }
    }

    // Should never reach here, but throw last error if we do
    throw lastError || new Error('Retry loop completed without result');
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Change retry strategy dynamically
   */
  withStrategy(strategy: RetryStrategy): RetryExecutor {
    return new RetryExecutor(strategy);
  }
}
