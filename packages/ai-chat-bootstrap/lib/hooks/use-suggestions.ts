import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { fetchSuggestionsService } from "../services/suggestions-service";
import {
  useAIContextStore,
  useAIFocusStore,
  useAIToolsStore,
  useAIMCPServersStore,
} from "../stores";
import { useSuggestionsStore } from "../stores/suggestions";
import type { Suggestion } from "../types/chat";

export interface UseSuggestionsOptions {
  enabled?: boolean;
  prompt?: string;
  messages: UIMessage[];
  onSuggestionClick?: (suggestion: Suggestion) => void;
  strategy?: "assistant-finish" | "eager" | "manual"; // when to auto fetch
  debounceMs?: number; // debounce for auto fetch triggers
  numSuggestions?: number; // override suggestion count
  api?: string; // override default /api/suggestions endpoint
  fetcher?: (
    request: Parameters<typeof fetchSuggestionsService>[0],
    opts: Parameters<typeof fetchSuggestionsService>[1]
  ) => ReturnType<typeof fetchSuggestionsService>; // test override
}

export interface UseSuggestionsReturn {
  suggestions: Suggestion[];
  isLoading: boolean;
  error: string | null;
  fetchSuggestions: () => Promise<void>;
  clearSuggestions: () => void;
  handleSuggestionClick: (suggestion: Suggestion) => void;
  onAssistantFinish: () => void;
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
  onSuggestionClick,
  strategy = "assistant-finish",
  debounceMs = 120,
  numSuggestions = 3,
  api,
  fetcher = fetchSuggestionsService,
}: UseSuggestionsOptions) {
  // Get store state with stable selectors
  const { suggestions, isLoading, error } = useSuggestionsStore(
    useShallow((state) => ({
      suggestions: state.suggestions,
      isLoading: state.isLoading,
      error: state.error,
    }))
  );

  // Get store actions (these are stable)
  const setSuggestions = useSuggestionsStore((state) => state.setSuggestions);
  const clearSuggestions = useSuggestionsStore(
    (state) => state.clearSuggestions
  );
  const setLoading = useSuggestionsStore((state) => state.setLoading);
  const setError = useSuggestionsStore((state) => state.setError);

  // Refs for controlling side-effects without re-renders
  const abortRef = useRef<AbortController | null>(null);
  const lastFetchKeyRef = useRef<string>("");
  const debounceRef = useRef<number | null>(null);

  // Get context and focus data
  const contextItemsMap = useAIContextStore(
    useShallow((state) => state.contextItems)
  );
  const focusItemsMap = useAIFocusStore(
    useShallow((state) => state.focusItems)
  );
  const toolsMap = useAIToolsStore(useShallow((state) => state.tools));
  const mcpToolSummaries = useAIMCPServersStore(
    useShallow((state) =>
      Array.from(state.servers.values()).flatMap((server) => server.tools)
    )
  );

  // Fetch suggestions based on current chat state
  const handleFetchSuggestions = useCallback(async () => {
    if (!enabled) return;
    // Build dedupe key: last assistant message id + counts of context/focus + prompt hash
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    const focus = Array.from(focusItemsMap.values());
    const contextItems = Array.from(contextItemsMap.values());
    const frontendTools = Array.from(toolsMap.values()).map<{
      name: string;
      description?: string;
    }>((tool) => ({
      name: tool.name,
      description: tool.description,
    }));
    const toolSummaries = [...frontendTools];
    const seenToolNames = new Set(toolSummaries.map((t) => t.name));
    mcpToolSummaries.forEach((tool) => {
      if (!tool?.name) return;
      if (!seenToolNames.has(tool.name)) {
        toolSummaries.push({
          name: tool.name,
          description: tool.description,
        });
        seenToolNames.add(tool.name);
      }
    });
    const keyParts = [
      lastAssistant?.id ?? "no-assistant",
      focus.length.toString(),
      contextItems.length.toString(),
      (prompt || "").slice(0, 32),
      toolSummaries
        .map((t) => `${t.name}:${t.description ?? ""}`)
        .join("|"),
    ];
    const fetchKey = keyParts.join("|");
    if (fetchKey === lastFetchKeyRef.current) return; // dedupe
    lastFetchKeyRef.current = fetchKey;

    // Abort any in-flight
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const suggestions = await fetcher(
        {
          messages,
          context: contextItems.length > 0 ? contextItems : undefined,
          focus: focus.length > 0 ? focus : undefined,
          tools: toolSummaries.length > 0 ? toolSummaries : undefined,
          prompt,
        },
        { signal: controller.signal, numSuggestions, api }
      );
      setSuggestions(suggestions);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Failed to fetch suggestions");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [
    enabled,
    messages,
    prompt,
    numSuggestions,
    api,
    toolsMap,
    mcpToolSummaries,
    focusItemsMap,
    contextItemsMap,
    setLoading,
    setError,
    setSuggestions,
    fetcher,
  ]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    (suggestion: Suggestion) => {
      onSuggestionClick?.(suggestion);
      // Clear suggestions after a suggestion is clicked (user is about to send a message)
      clearSuggestions();
    },
    [onSuggestionClick, clearSuggestions]
  ); // Only depend on the callback

  // Auto-fetch suggestions on initial load
  useEffect(() => {
    if (!enabled) return;
    if (strategy === "eager" && messages.length === 0) {
      handleFetchSuggestions();
    }
  }, [enabled, strategy, messages.length, handleFetchSuggestions]);

  // Clear suggestions when user sends a message
  useEffect(() => {
    if (!enabled || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      clearSuggestions();
    }
  }, [enabled, messages, clearSuggestions]); // Trigger when messages change

  // Callback to be called when assistant finishes responding
  const onAssistantFinish = useCallback(() => {
    if (!enabled) return;
    if (strategy === "assistant-finish" || strategy === "eager") {
      // Debounce to avoid rapid double triggers
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(() => {
        handleFetchSuggestions();
      }, debounceMs);
    }
  }, [enabled, strategy, debounceMs, handleFetchSuggestions]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    fetchSuggestions: handleFetchSuggestions,
    clearSuggestions,
    handleSuggestionClick,
    onAssistantFinish,
  };
}
