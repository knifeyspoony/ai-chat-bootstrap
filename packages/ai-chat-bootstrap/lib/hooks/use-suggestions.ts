import { useEffect, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { UIMessage } from 'ai'
import { useSuggestionsStore } from '../stores/suggestions'
import { useAIContextStore, useAIFocusStore } from '../stores'
import type { Suggestion } from '../types/suggestions'

export interface UseSuggestionsOptions {
  enabled?: boolean
  prompt?: string
  messages: UIMessage[]
  onSuggestionClick?: (suggestion: Suggestion) => void
}

export interface UseSuggestionsReturn {
  suggestions: Suggestion[]
  isLoading: boolean
  error: string | null
  fetchSuggestions: () => Promise<void>
  clearSuggestions: () => void
  handleSuggestionClick: (suggestion: Suggestion) => void
  onAssistantFinish: () => void
}

/**
 * Hook for managing contextual suggestions in chat.
 * Automatically fetches suggestions when enabled and assistant messages complete.
 * Clears suggestions when user sends a message.
 */
export function useSuggestions({
  enabled = false,
  prompt,
  messages,
  onSuggestionClick
}: UseSuggestionsOptions) {
  // Get store state with stable selectors
  const { suggestions, isLoading, error } = useSuggestionsStore(
    useShallow(state => ({
      suggestions: state.suggestions,
      isLoading: state.isLoading,
      error: state.error
    }))
  )
  
  // Get store actions (these are stable)
  const fetchSuggestions = useSuggestionsStore(state => state.fetchSuggestions)
  const clearSuggestions = useSuggestionsStore(state => state.clearSuggestions)
  
  // Get context and focus data
  const contextMap = useAIContextStore(useShallow(state => state.context))
  const focusItemsMap = useAIFocusStore(useShallow(state => state.focusItems))
  
  // Fetch suggestions based on current chat state
  const handleFetchSuggestions = useCallback(async () => {
    if (!enabled) return
    
    const context = Object.fromEntries(contextMap.entries())
    const focus = Array.from(focusItemsMap.values())
    
    await fetchSuggestions({
      messages,
      context: Object.keys(context).length > 0 ? context : undefined,
      focus: focus.length > 0 ? focus : undefined,
      prompt
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, messages, prompt]) // Only depend on actual data that should trigger re-fetch
  
  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    onSuggestionClick?.(suggestion)
    // Clear suggestions after a suggestion is clicked (user is about to send a message)
    clearSuggestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSuggestionClick]) // Only depend on the callback
  
  // Auto-fetch suggestions on initial load
  useEffect(() => {
    if (!enabled) return
    
    // Initial fetch when chat is empty or first loads
    if (messages.length === 0) {
      handleFetchSuggestions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]) // Only on mount and enabled change
  
  // Clear suggestions when user sends a message
  useEffect(() => {
    if (!enabled || messages.length === 0) return
    
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'user') {
      clearSuggestions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, messages.length]) // Trigger when messages count changes
  
  // Callback to be called when assistant finishes responding
  const onAssistantFinish = useCallback(() => {
    if (enabled) {
      handleFetchSuggestions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]) // Only depend on enabled state

  return {
    suggestions,
    isLoading,
    error,
    fetchSuggestions: handleFetchSuggestions,
    clearSuggestions,
    handleSuggestionClick,
    onAssistantFinish
  }
}