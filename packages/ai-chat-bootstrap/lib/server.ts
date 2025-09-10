// Server-only entry point.
// Exposes utilities & types safe for Next.js Route Handlers / Edge without pulling in React components.
// NOTE: Do NOT export React components or hooks from this file.

export { cn } from "./utils";
export { deserializeFrontendTools } from "./utils/backend-tool-utils";
export { buildEnrichedSystemPrompt } from "./utils/prompt-utils";
export * from "./utils/token-utils";

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
