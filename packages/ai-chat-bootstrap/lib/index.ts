// Core utilities
export * from "./utils"

// Chat components
export * from "./components/chat"

// AI Integration hooks
export * from "./hooks"

// Zustand stores (for advanced usage)
export * from "./stores"

// Re-export key types for convenience
export type { UIMessage } from 'ai'
export type { Suggestion, SuggestionsRequest, SuggestionsResponse } from './types/suggestions'
export type { ChatRequest, FocusItem } from './types/chat'
export type { SerializedTool } from './stores/tools'