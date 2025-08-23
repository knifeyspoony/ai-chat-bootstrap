// Core utilities
export * from "@lib/utils"

// Chat components
export * from "@lib/components/chat"

// AI Integration hooks
export * from "@lib/hooks"

// Zustand stores (for advanced usage)
export * from "@lib/stores"

// Re-export key types for convenience
export type { UIMessage } from 'ai'
export type { Suggestion, SuggestionsRequest, SuggestionsResponse } from '@lib/types/suggestions'