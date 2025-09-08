import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  UIMessage,
} from "ai";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAIContextStore, useAIFocusStore, useAIToolsStore } from "../stores";
import { useChatStore } from "../stores/chat";

/**
 * Enhanced chat hook that integrates with AI SDK and our Zustand stores.
 * Automatically includes context and handles tool execution.
 */
export function useAIChat(
  options: {
    api?: string;
    systemPrompt?: string;
    onToolCall?: (toolCall: unknown) => void;
    onFinish?: () => void;
    initialMessages?: UIMessage[];
  } = {}
) {
  const {
    api = "/api/chat",
    systemPrompt,
    onToolCall,
    onFinish,
    initialMessages,
  } = options;

  // Get raw store data with stable selectors - these return the same reference when unchanged
  const contextItemsMap = useAIContextStore(
    useShallow((state) => state.contextItems)
  );
  const toolsMap = useAIToolsStore(useShallow((state) => state.tools));
  const focusItemsMap = useAIFocusStore(
    useShallow((state) => state.focusItems)
  );
  const executeTool = useAIToolsStore((state) => state.executeTool);
  const setError = useChatStore((state) => state.setError);

  // Note: Removed chat store sync to prevent infinite re-renders

  // Get focus items - they're already serializable
  const focusItems = useMemo(() => {
    return Array.from(focusItemsMap.values());
  }, [focusItemsMap]);

  // Cache serialized data - only recompute when raw store data changes
  const context = useMemo(() => {
    // Provide already normalized list for any UI needs
    return Array.from(contextItemsMap.values());
  }, [contextItemsMap]);

  const tools = useMemo(() => {
    return Array.from(toolsMap.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters, // This will need to be converted to JSON Schema in the transport
    }));
  }, [toolsMap]);

  // Memoize available tools to avoid creating new array in return
  const availableTools = useMemo(() => {
    return Array.from(toolsMap.values());
  }, [toolsMap]);

  // Create transport with dynamic request preparation - only recreate when api/systemPrompt changes
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api,
      prepareSendMessagesRequest: (options) => {
        // Get fresh store data for each request - called only when sending messages
        const currentContext = useAIContextStore.getState().serialize();
        const currentTools = useAIToolsStore
          .getState()
          .serializeToolsForBackend();
        const currentFocusItems = useAIFocusStore.getState().getAllFocusItems();
        const callerBody = options.body ?? {};
        // Per-call overrides: if caller provided tools/systemPrompt, prefer them
        const overrideTools = (callerBody as any).tools as
          | unknown[]
          | undefined;
        const overrideSystemPrompt = (callerBody as any).systemPrompt as
          | string
          | undefined;
        const toolsToSend = overrideTools ?? currentTools;
        const systemPromptToSend = overrideSystemPrompt ?? systemPrompt;

        return {
          ...options,
          body: {
            ...callerBody,
            messages: options.messages,
            context: currentContext,
            tools: toolsToSend,
            focus: currentFocusItems, // Send complete focus items
            systemPrompt: systemPromptToSend,
          },
        };
      },
    });
  }, [api, systemPrompt]);

  const chatHook = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    messages: initialMessages,
    onToolCall: async ({ toolCall }) => {
      try {
        // Execute frontend tool if available
        const result = await executeTool(toolCall.toolName, toolCall.input);
        onToolCall?.(toolCall);
        // Add the tool result to the chat stream and still return it
        addToolResultForCall(toolCall, result);
      } catch (error) {
        console.error("Tool execution error:", error);
        setError(
          error instanceof Error ? error.message : "Tool execution failed"
        );
        throw error;
      }
    },
    onFinish: () => {
      // Hook handles loading state internally
      onFinish?.();
    },
    onError: (error) => {
      console.error("Chat error:", error);
      setError(error instanceof Error ? error.message : "Chat error occurred");
    },
  });

  // Note: Removed chat store sync - causes infinite re-renders
  // The chat hook manages its own state internally

  // Helper to attach tool results to the chat
  function addToolResultForCall(
    toolCall: { toolName: string; toolCallId: string; input: unknown },
    output: unknown
  ) {
    try {
      chatHook.addToolResult({
        tool: toolCall.toolName as string,
        toolCallId: toolCall.toolCallId,
        output: output,
      });
    } catch (e) {
      console.error("addToolResult error:", e);
    }
  }

  const sendMessageWithContext = (content: string) => {
    setError(null);
    chatHook.sendMessage({ text: content });
  };

  // Send AI command message with specific tool filtering
  const sendAICommandMessage = (
    content: string,
    toolName: string,
    commandSystemPrompt?: string
  ) => {
    setError(null);

    // Filter tools to only include the specified tool (per-call override via body)
    const allTools = useAIToolsStore.getState().serializeToolsForBackend();
    const filteredTools = allTools.filter((tool) => tool.name === toolName);

    // Send message with per-call overrides; transport will pick these up in prepareSendMessagesRequest
    chatHook.sendMessage(
      { text: content },
      {
        body: {
          tools: filteredTools,
          systemPrompt: commandSystemPrompt || systemPrompt,
        },
      }
    );
  };

  // Retry last message with error recovery
  const retryLastMessage = () => {
    const lastMessage = chatHook.messages[chatHook.messages.length - 1];
    if (lastMessage?.role === "user") {
      // Find the text part in the last user message
      const textPart = lastMessage.parts?.find((part) => part.type === "text");
      if (textPart && "text" in textPart) {
        sendMessageWithContext(textPart.text);
      }
    }
  };

  // Clear error function
  const clearError = () => {
    setError(null);
  };

  return {
    ...chatHook,
    sendMessageWithContext,
    sendAICommandMessage,
    retryLastMessage,
    clearError,
    isLoading:
      chatHook.status === "streaming" || chatHook.status === "submitted",
    // Expose cached reactive store state for components that need it
    context,
    availableTools,
    tools,
    focusItems,
  };
}
