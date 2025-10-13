// Server-only entry point.
// Exposes utilities & types safe for Next.js Route Handlers / Edge without pulling in React components.
// NOTE: Do NOT export React components or hooks from this file.

export {
  createAIChatHandler,
  createCompressionHandler,
  createMcpToolsHandler,
  createSuggestionsHandler,
  createThreadTitleHandler,
} from "./handlers";
export { cn } from "./utils";
export {
  deserializeFrontendTools,
  loadMcpTools,
} from "./utils/backend-tool-utils";
export { buildEnrichedSystemPrompt } from "./utils/prompt-utils";
export * from "./utils/token-utils";

// Re-export types & schemas (pure TypeScript / zod, no React)
export type {
  MCPServerToolsRequest,
  MCPServerToolsResponse,
  MCPServerToolError,
  SerializedMCPServer,
} from "./stores/mcp";
export { SuggestionsSchema } from "./types/chat";
export type {
  ChatRequest,
  FocusItem,
  Suggestion,
  SuggestionsRequest,
  SuggestionsResponse,
  SuggestionsSchemaType,
} from "./types/chat";
export { type CompressionServiceRequest } from "./types/compression";
