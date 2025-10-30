import { useChat } from "@ai-sdk/react";
import {
  lastAssistantMessageIsCompleteWithToolCalls,
  UIMessage,
} from "ai";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useShallow } from "zustand/react/shallow";
import {
  useAIContextStore,
  useAIFocusStore,
  useAIToolsStore,
} from "../stores";
import { useChatStore } from "../stores/";
import type { Suggestion } from "../types/chat";
import {
  type BuildCompressionPayloadResult,
  type CompressionPinnedMessage,
  type CompressionRunOptions,
} from "../types/compression";
import { logDevError } from "../utils/dev-logger";
import { normalizeMessagesMetadata } from "../utils/message-normalization";
import { useAIChatBranching } from "./use-ai-chat-branching";
import { useAIChatCompression } from "./use-ai-chat-compression";
import { useChainOfThought } from "./use-chain-of-thought";
import { useSuggestions } from "./use-suggestions";
import { useMCPIntegration } from "./use-mcp-integration";
import { useChatTransport } from "./use-chat-transport";
import { useMessageOperations } from "./use-message-operations";
import { useModelCompressionSync } from "./use-model-compression-sync";
import { useThreadLifecycle } from "./use-thread-lifecycle";

// Re-export types
export type {
  UseAIChatOptions,
  DevToolsConfig,
  ThreadTitleOptions,
  ThreadsOptions,
  SuggestionsOptions,
} from "./use-ai-chat-types";

type ChatHelpers = ReturnType<typeof useChat>;
export type { ChatHelpers };

/**
 * Main AI Chat hook - composed from specialized sub-hooks.
 */
export function useAIChat(options: import("./use-ai-chat-types").UseAIChatOptions = {}) {
  const {
    transport,
    messages,
    threads,
    features,
    mcp,
    models: modelsGroup,
    compression: compressionOptions,
    suggestions: suggestionsOptions,
    devTools,
  } = options;

  // Extract and normalize options
  const transportOptions = transport ?? {};
  const api = transportOptions.api ?? "/api/chat";
  const userPrepareSendMessagesRequest = transportOptions.prepareSendMessagesRequest;
  const systemPrompt = messages?.systemPrompt;
  const initialMessages = messages?.initial;
  const threadsGroup = threads ?? {};
  const threadId = threadsGroup.id;
  const scopeKey = threadsGroup.scopeKey;
  const chainOfThoughtEnabled = features?.chainOfThought ?? false;
  const branchingEnabled = features?.branching ?? false;
  const autoCreateThread = threadsGroup.autoCreate ?? true;
  const warnOnMissingThread = threadsGroup.warnOnMissing ?? false;
  const threadsEnabled = threadsGroup.enabled ?? false;
  const incomingModels = modelsGroup?.available ?? [];
  const providedModel = modelsGroup?.initial;
  const mcpEnabled = mcp?.enabled ?? false;
  const suggestionsConfig = suggestionsOptions;
  const suggestionsEnabled = suggestionsConfig?.enabled ?? false;
  const suggestionCount = suggestionsConfig?.count ?? 3;
  const compressionEnabled = compressionOptions?.enabled ?? false;

  // Compute devTools flags
  const devToolsEnabled = devTools?.enabled ?? false;
  const showErrorMessages = devTools?.showErrorMessages ?? devToolsEnabled;

  // Get tools state
  const { registerTool, unregisterTool } = useAIToolsStore(
    useShallow((state) => ({
      registerTool: state.registerTool,
      unregisterTool: state.unregisterTool,
    }))
  );
  const executeTool = useAIToolsStore((state) => state.executeTool);
  const setError = useChatStore((state) => state.setError);

  // Get context, tools, and focus for display
  const contextItemsMap = useAIContextStore(
    useShallow((state) => state.contextItems)
  );
  const toolsMap = useAIToolsStore(useShallow((state) => state.tools));
  const focusItemsMap = useAIFocusStore(
    useShallow((state) => state.focusItems)
  );

  const context = useMemo(() => {
    return Array.from(contextItemsMap.values());
  }, [contextItemsMap]);

  const tools = useMemo(() => {
    return Array.from(toolsMap.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters,
    }));
  }, [toolsMap]);

  const availableTools = useMemo(() => {
    return Array.from(toolsMap.values());
  }, [toolsMap]);

  const focusItems = useMemo(() => {
    return Array.from(focusItemsMap.values());
  }, [focusItemsMap]);

  // Create refs first - these are stable and don't change
  const chatHookRef = useRef<ChatHelpers | null>(null);
  const suggestionsFinishRef = useRef<(() => void) | null>(null);
  const messagesSnapshotRef = useRef<UIMessage[]>([]);
  const [draftInput, setDraftInput] = useState("");

  // Initialize compression helpers
  const compressionHelpers = useAIChatCompression({
    compression: compressionOptions,
  });
  const buildCompressionRequestPayload = compressionHelpers.buildPayload;
  const baseCompressionController = compressionHelpers.controller;
  const compressionConfig = compressionHelpers.config;

  // Initialize chain of thought
  useChainOfThought({
    enabled: chainOfThoughtEnabled,
    registerTool,
    unregisterTool,
  });

  // Initialize MCP integration
  useMCPIntegration({
    enabled: mcpEnabled,
    api: mcp?.api,
    servers: mcp?.servers,
    showErrorMessages,
  });

  // Initialize model-compression sync BEFORE creating transport
  // Use getter function so it can access chatHook.messages via ref after chatHook is created
  const modelCompressionSync = useModelCompressionSync({
    incomingModels,
    providedModel,
    compressionOptions,
    compressionEnabled,
    getChatMessages: () => chatHookRef.current?.messages ?? [],
    setChatMessages: (messages) => chatHookRef.current?.setMessages(messages),
    threadId,
    compressionController: baseCompressionController,
    compressionConfig,
    showErrorMessages,
  });

  // Create transport with selectedModelId from modelCompressionSync
  const chatTransport = useChatTransport({
    api,
    systemPrompt,
    chainOfThoughtEnabled,
    selectedModelId: modelCompressionSync.selectedModelId,
    buildCompressionRequestPayload,
    userPrepareSendMessagesRequest,
    showErrorMessages,
  });

  // Initialize thread lifecycle (uses chatHookRef for operations)
  const threadLifecycle = useThreadLifecycle({
    threadsEnabled,
    threadId,
    scopeKey,
    autoCreate: autoCreateThread,
    warnOnMissing: warnOnMissingThread,
    titleOptions: threadsGroup.title,
    initialMessages,
    chatHookRef,
    showErrorMessages,
  });

  // NOW initialize the core chat hook WITH transport
  const chatHook = useChat({
    transport: chatTransport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    messages: threadLifecycle.existingThreadMessages ?? initialMessages,
    experimental_throttle: 100,
    onToolCall: async ({ toolCall }) => {
      try {
        if (!toolCall.dynamic) {
          const result = await executeTool(toolCall.toolName, toolCall.input);
          chatHook.addToolResult({
            tool: toolCall.toolName as string,
            toolCallId: toolCall.toolCallId,
            output: result,
          });
        }
      } catch (error) {
        setError("Tool execution failed");
        throw error;
      }
    },
    onFinish: ({ message }) => {
      const latestMessages =
        messagesSnapshotRef.current.length > 0
          ? messagesSnapshotRef.current
          : chatHookRef.current?.messages ?? chatHook.messages;

      suggestionsFinishRef.current?.();

      // Call thread lifecycle onFinish
      threadLifecycle.onFinish(message, latestMessages);
    },
    onError: (error) => {
      logDevError(
        "[acb][useAIChat] Chat error occurred",
        error ?? new Error("Unknown chat error"),
        showErrorMessages
      );
      setError("Chat error occurred");
    },
  });

  // Update chatHookRef immediately after chatHook is created
  useEffect(() => {
    chatHookRef.current = chatHook;
  }, [chatHook]);

  // Update messages snapshot
  useEffect(() => {
    if (chatHook.messages.length > 0) {
      messagesSnapshotRef.current = chatHook.messages;
    }
  }, [chatHook.messages]);

  // Normalize message metadata (only when not streaming to avoid excessive renders)
  useEffect(() => {
    // Skip normalization during streaming - wait until message is complete
    if (chatHook.status === "streaming") return;

    const latest = chatHookRef.current;
    if (!latest) return;
    const { messages: normalized, changed } = normalizeMessagesMetadata(
      latest.messages
    );
    if (changed) {
      if (showErrorMessages) {
        console.log("[acb][useAIChat] Normalizing message metadata");
      }
      latest.setMessages(normalized);
    }
  }, [chatHook.messages, chatHook.status, showErrorMessages]);

  // Initialize message operations
  const messageOps = useMessageOperations({
    threadId,
    systemPrompt,
    chatHook,
    chatHookRef,
    showErrorMessages,
  });

  // Enhance compression controller with message operations
  const enhancedPinMessage = useCallback(
    (
      message: UIMessage,
      options?: Parameters<
        typeof baseCompressionController.actions.pinMessage
      >[1]
    ) => {
      const pinnedAt = options?.pinnedAt ?? Date.now();
      const pinnedState = {
        pinnedAt,
        pinnedBy: options?.pinnedBy,
        reason: options?.reason,
      };

      const updatedMessage = messageOps.applyPinnedStateToMessage(
        message,
        pinnedState
      );

      baseCompressionController.actions.pinMessage(updatedMessage, {
        ...options,
        pinnedAt,
      });
    },
    // baseCompressionController itself is intentionally not in deps - only its actions
    // The full controller is a stable reference and including it would cause unnecessary re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messageOps, baseCompressionController.actions]
  );

  const enhancedUnpinMessage = useCallback(
    (messageId: string) => {
      if (messageId) {
        messageOps.mutateMessageById(messageId, (current) =>
          messageOps.applyPinnedStateToMessage(current, null)
        );
      }
      baseCompressionController.actions.unpinMessage(messageId);
    },
    [messageOps, baseCompressionController.actions]
  );

  const enhancedSetPinnedMessages = useCallback(
    (pins: CompressionPinnedMessage[]) => {
      baseCompressionController.actions.setPinnedMessages(pins);
      messageOps.applyPinnedStateToBatch(pins);
    },
    [baseCompressionController.actions, messageOps]
  );

  const enhancedClearPinnedMessages = useCallback(() => {
    baseCompressionController.actions.clearPinnedMessages();
    messageOps.clearAllPinnedStates();
  }, [baseCompressionController.actions, messageOps]);

  const compressionActions = useMemo(
    () => ({
      ...baseCompressionController.actions,
      pinMessage: enhancedPinMessage,
      setPinnedMessages: enhancedSetPinnedMessages,
      unpinMessage: enhancedUnpinMessage,
      clearPinnedMessages: enhancedClearPinnedMessages,
    }),
    [
      baseCompressionController.actions,
      enhancedClearPinnedMessages,
      enhancedPinMessage,
      enhancedSetPinnedMessages,
      enhancedUnpinMessage,
    ]
  );

  const runCompression = useCallback(
    async (
      options?: CompressionRunOptions
    ): Promise<BuildCompressionPayloadResult> => {
      const latestHook = messageOps.getLatestChat();
      const baseMessages = (latestHook.messages as UIMessage[]) ?? [];
      // buildCompressionRequestPayload is from useAIChatCompression and already handles the call
      return buildCompressionRequestPayload(baseMessages, options);
    },
    [buildCompressionRequestPayload, messageOps]
  );

  const compressionController = useMemo(
    () => ({
      ...baseCompressionController,
      actions: compressionActions,
      runCompression,
    }),
    [baseCompressionController, compressionActions, runCompression]
  );

  // Initialize branching
  const branching = useAIChatBranching({
    enabled: branchingEnabled,
    chatHook,
    chatHookRef,
    persistMessagesIfChanged: threadLifecycle.persistMessagesIfChanged,
  });

  // Initialize suggestions
  const handleSuggestionSend = useCallback(
    (suggestion: Suggestion) => {
      if (!suggestion?.longSuggestion) return;
      messageOps.sendMessageWithContext(suggestion.longSuggestion);
    },
    [messageOps]
  );

  const deferredSuggestionMessages = useDeferredValue(chatHook.messages);
  const {
    suggestions: suggestionItems,
    isLoading: suggestionsLoading,
    error: suggestionsError,
    fetchSuggestions,
    clearSuggestions,
    handleSuggestionClick: baseHandleSuggestionClick,
    onAssistantFinish,
  } = useSuggestions({
    enabled: suggestionsEnabled,
    prompt: suggestionsConfig?.prompt,
    messages: deferredSuggestionMessages,
    onSuggestionClick: handleSuggestionSend,
    strategy: suggestionsConfig?.strategy,
    debounceMs: suggestionsConfig?.debounceMs,
    numSuggestions: suggestionsConfig?.count,
    api: suggestionsConfig?.api,
    fetcher: suggestionsConfig?.fetcher,
  });

  useEffect(() => {
    suggestionsFinishRef.current = suggestionsEnabled
      ? onAssistantFinish
      : null;
  }, [suggestionsEnabled, onAssistantFinish]);

  // Return unified API
  return {
    ...chatHook,
    regenerate: branching.regenerate,
    input: draftInput,
    setInput: setDraftInput,
    sendMessageWithContext: messageOps.sendMessageWithContext,
    sendAICommandMessage: messageOps.sendAICommandMessage,
    retryLastMessage: messageOps.retryLastMessage,
    clearError: messageOps.clearError,
    isLoading:
      chatHook.status === "streaming" || chatHook.status === "submitted",
    context,
    availableTools,
    tools,
    focusItems,
    mcpEnabled,
    models: modelCompressionSync.models,
    model: modelCompressionSync.selectedModelId,
    setModel: modelCompressionSync.setModel,
    threadId,
    scopeKey,
    chainOfThoughtEnabled,
    compression: compressionController,
    branching: branching.enabled
      ? ({
          enabled: true as const,
          selectBranch: branching.selectBranch,
        } as const)
      : ({ enabled: false as const } as const),
    suggestions: {
      enabled: suggestionsEnabled,
      items: suggestionItems,
      count: suggestionCount,
      isLoading: suggestionsLoading,
      error: suggestionsError,
      handleSuggestionClick: baseHandleSuggestionClick,
      fetchSuggestions,
      clearSuggestions,
    },
    isRestoringThread: threadLifecycle.isRestoringThread,
  };
}
