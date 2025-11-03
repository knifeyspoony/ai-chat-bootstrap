/**
 * Structured error types for MCP client operations.
 * These provide SDK-agnostic error handling instead of string matching.
 */

/**
 * Base class for all MCP-related errors.
 */
export abstract class MCPError extends Error {
  abstract readonly code: string;
  abstract readonly recoverable: boolean;

  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Connection-related errors (network issues, timeouts, etc.)
 */
export class MCPConnectionError extends MCPError {
  readonly code = 'MCP_CONNECTION_ERROR';
  readonly recoverable = true;
}

/**
 * Operation timeout errors
 */
export class MCPTimeoutError extends MCPError {
  readonly code = 'MCP_TIMEOUT';
  readonly recoverable = true;
}

/**
 * Client initialization errors (already initialized, invalid config, etc.)
 */
export class MCPInitializationError extends MCPError {
  readonly code = 'MCP_INITIALIZATION_ERROR';
  readonly recoverable = true; // Can retry with fresh client
}

/**
 * Tool execution errors from the MCP server
 */
export class MCPToolError extends MCPError {
  readonly code = 'MCP_TOOL_ERROR';
  readonly recoverable = false;
}

/**
 * Invalid request or malformed data
 */
export class MCPInvalidRequestError extends MCPError {
  readonly code = 'MCP_INVALID_REQUEST';
  readonly recoverable = false;
}

/**
 * Server-side errors
 */
export class MCPServerError extends MCPError {
  readonly code = 'MCP_SERVER_ERROR';
  readonly recoverable = true; // Might be transient
}

/**
 * Circuit breaker open error (server is degraded)
 */
export class MCPCircuitBreakerOpenError extends MCPError {
  readonly code = 'MCP_CIRCUIT_BREAKER_OPEN';
  readonly recoverable = false; // Don't retry immediately
}

/**
 * Unknown/unclassified errors
 */
export class MCPUnknownError extends MCPError {
  readonly code = 'MCP_UNKNOWN_ERROR';
  readonly recoverable = false;
}

/**
 * Adapter to convert SDK errors to our structured error types.
 * This isolates us from SDK-specific error formats.
 */
export class MCPErrorAdapter {
  /**
   * Convert any error from the MCP SDK to our error hierarchy.
   */
  static fromSDKError(error: unknown, context?: Record<string, unknown>): MCPError {
    // Already one of our errors, return as-is
    if (error instanceof MCPError) {
      return error;
    }

    // Check for common Node.js error codes
    if (this.isNodeError(error)) {
      return this.handleNodeError(error, context);
    }

    // Check for error messages (fallback, less reliable)
    if (error instanceof Error) {
      return this.classifyByMessage(error, context);
    }

    // Completely unknown error
    return new MCPUnknownError(
      'An unknown error occurred',
      error,
      context
    );
  }

  /**
   * Check if error is a Node.js system error with error code
   */
  private static isNodeError(error: unknown): error is NodeJS.ErrnoException {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as { code: unknown }).code === 'string'
    );
  }

  /**
   * Handle Node.js system errors by error code
   */
  private static handleNodeError(
    error: NodeJS.ErrnoException,
    context?: Record<string, unknown>
  ): MCPError {
    const code = error.code;
    const message = error.message || 'Network error';

    switch (code) {
      case 'ECONNREFUSED':
      case 'ENOTFOUND':
      case 'ECONNRESET':
      case 'ETIMEDOUT':
      case 'EHOSTUNREACH':
      case 'ENETUNREACH':
        return new MCPConnectionError(message, error, context);

      case 'ABORT_ERR':
      case 'TIMEOUT':
        return new MCPTimeoutError(message, error, context);

      default:
        return new MCPServerError(message, error, { ...context, code });
    }
  }

  /**
   * Classify error by examining message content.
   * This is a fallback when we can't identify error by structure.
   */
  private static classifyByMessage(
    error: Error,
    context?: Record<string, unknown>
  ): MCPError {
    const message = error.message.toLowerCase();

    // Initialization errors
    if (
      message.includes('already initialized') ||
      message.includes('client already') ||
      message.includes('connection already')
    ) {
      return new MCPInitializationError(error.message, error, context);
    }

    // Timeout errors
    if (
      message.includes('timeout') ||
      message.includes('timed out')
    ) {
      return new MCPTimeoutError(error.message, error, context);
    }

    // Connection errors
    if (
      message.includes('connection') ||
      message.includes('connect') ||
      message.includes('network')
    ) {
      return new MCPConnectionError(error.message, error, context);
    }

    // Invalid request errors
    if (
      message.includes('invalid request') ||
      message.includes('bad request') ||
      message.includes('malformed')
    ) {
      return new MCPInvalidRequestError(error.message, error, context);
    }

    // Server errors
    if (
      message.includes('server error') ||
      message.includes('internal error')
    ) {
      return new MCPServerError(error.message, error, context);
    }

    // Default to unknown
    return new MCPUnknownError(error.message, error, context);
  }

  /**
   * Check if an error should trigger circuit breaker
   */
  static shouldTripCircuitBreaker(error: MCPError): boolean {
    // Connection and server errors indicate systemic issues
    return (
      error instanceof MCPConnectionError ||
      error instanceof MCPServerError ||
      error instanceof MCPTimeoutError
    );
  }

  /**
   * Check if an error warrants retry
   */
  static isRetryable(error: MCPError): boolean {
    return error.recoverable;
  }
}
