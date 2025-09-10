// Core utilities
export * from "./utils";
export * from "./utils/backend-tool-utils";
export * from "./utils/prompt-utils";

// Chat components
export * from "./components/chat";

// AI Integration hooks
export * from "./hooks";

// Zustand stores (for advanced usage)
export * from "./stores";

// Re-export key types for convenience
export type { UIMessage } from "ai";
export type { SerializedTool } from "./stores/tools";
export { SuggestionsSchema } from "./types/chat";
export type {
  ChatRequest,
  FocusItem,
  Suggestion,
  SuggestionsRequest,
  SuggestionsResponse,
  SuggestionsSchemaType,
} from "./types/chat";
