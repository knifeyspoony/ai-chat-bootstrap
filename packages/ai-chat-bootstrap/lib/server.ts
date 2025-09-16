// Server-only entry point.
// Exposes utilities & types safe for Next.js Route Handlers / Edge without pulling in React components.
// NOTE: Do NOT export React components or hooks from this file.

export { cn } from "./utils";
export {
  deserializeFrontendTools,
  loadMcpTools,
} from "./utils/backend-tool-utils";
export { buildEnrichedSystemPrompt } from "./utils/prompt-utils";
export * from "./utils/token-utils";
export {
  createAIChatHandler,
  createSuggestionsHandler,
  createThreadTitleHandler,
  createMcpToolsHandler,
} from "./server-handlers";

// Re-export types & schemas (pure TypeScript / zod, no React)
export { SuggestionsSchema } from "./types/chat";
export type {
  ChatRequest,
  FocusItem,
  Suggestion,
  SuggestionsRequest,
  SuggestionsResponse,
  SuggestionsSchemaType,
} from "./types/chat";
export type { SerializedMCPServer } from "./stores/mcp";
export type {
  MCPServerToolsRequest,
  MCPServerToolsResponse,
} from "./stores/mcp";
