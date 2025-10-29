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
export type { AssistantAction, AssistantActionsConfig } from "./types/actions";
export { SuggestionsSchema } from "./types/chat";
export type {
  ChatRequest,
  FocusItem,
  Suggestion,
  SuggestionsRequest,
  SuggestionsResponse,
  SuggestionsSchemaType,
} from "./types/chat";

export {
  DEFAULT_COMPRESSION_THRESHOLD,
  normalizeCompressionConfig,
} from "./types/compression";
export type {
  BuildCompressionPayloadInput,
  BuildCompressionPayloadResult,
  CompressionArtifact,
  CompressionRunOptions,
  CompressionServiceFetcher,
  CompressionServiceOptions,
  CompressionServiceRequest,
  CompressionServiceResponse,
  CompressionSnapshot,
  CompressionTriggerReason,
  CompressionUsage,
  NormalizedCompressionConfig,
} from "./types/compression";

export type {
  ChatThread,
  ChatThreadMeta,
  ChatThreadPersistence,
  CreateThreadOptions,
  CloneThreadOptions,
} from "./types/threads";

export {
  createIndexedDBChatThreadPersistence,
  getDefaultChatThreadPersistence,
} from "./persistence/chat-threads-indexeddb";

export {
  ensureMessageMetadata,
  normalizeMessagesMetadata,
} from "./utils/message-normalization";

// Optional: Variant helpers (CVA) for consumers wanting pure class composition
export * from "./variants";
