import { useCallback, useRef } from "react";
import type { UIMessage } from "ai";
import { useAIToolsStore, useChatThreadsStore } from "../stores";
import { useChatStore } from "../stores/";
import type {
  CompressionPinnedMessage,
} from "../types/compression";
import {
  withCompressionPinnedState,
  type CompressionMessagePinnedState,
} from "../utils/compression/message-metadata";
import { logDevError } from "../utils/dev-logger";

type ChatHelpers = {
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;
  sendMessage: (
    message: { text: string; metadata?: Record<string, unknown> },
    options?: { body?: Record<string, unknown> }
  ) => void;
  clearError: () => void;
};

export interface UseMessageOperationsOptions {
  threadId?: string;
  systemPrompt?: string;
  chatHook: ChatHelpers;
  chatHookRef: React.MutableRefObject<ChatHelpers | null>;
  showErrorMessages?: boolean;
}

/**
 * Hook to manage message operations including sending, retrying, and mutation.
 * Handles integration with thread persistence and error management.
 */
export function useMessageOperations({
  threadId,
  systemPrompt,
  chatHook,
  chatHookRef,
  showErrorMessages = false,
}: UseMessageOperationsOptions) {
  const setError = useChatStore((state) => state.setError);
  const threadStore = useChatThreadsStore;
  const systemPromptRef = useRef(systemPrompt);

  // Update ref when systemPrompt changes
  useRef(() => {
    systemPromptRef.current = systemPrompt;
  });

  const getLatestChat = useCallback(
    () => chatHookRef.current ?? chatHook,
    [chatHook, chatHookRef]
  );

  const resetErrorState = useCallback(() => {
    setError(null);
    try {
      getLatestChat().clearError();
    } catch (error) {
      logDevError(
        "[acb][useMessageOperations] failed to clear chat error state",
        error,
        showErrorMessages
      );
    }
  }, [getLatestChat, setError, showErrorMessages]);

  const mutateMessageById = useCallback(
    (
      messageId: string,
      updater: (message: UIMessage) => UIMessage
    ): UIMessage | undefined => {
      if (!messageId) return undefined;
      const latestHook = getLatestChat();
      const currentMessages = latestHook.messages as UIMessage[];
      const targetIndex = currentMessages.findIndex(
        (message) => message?.id === messageId
      );
      if (targetIndex === -1) return undefined;

      const currentMessage = currentMessages[targetIndex];
      const updated = updater(currentMessage);
      if (!updated || updated === currentMessage) {
        return currentMessage;
      }

      const nextMessages = currentMessages.slice();
      nextMessages[targetIndex] = updated;
      latestHook.setMessages(nextMessages);
      return updated;
    },
    [getLatestChat]
  );

  const applyPinnedStateToMessage = useCallback(
    (message: UIMessage, pinned: CompressionMessagePinnedState | null) => {
      if (!message?.id) {
        return withCompressionPinnedState(message, pinned);
      }
      const updated = mutateMessageById(message.id, (current) =>
        withCompressionPinnedState(current, pinned)
      );
      return updated ?? withCompressionPinnedState(message, pinned);
    },
    [mutateMessageById]
  );

  const sendMessageWithContext = useCallback(
    (content: string) => {
      resetErrorState();
      const timestamp = Date.now();

      // Capture message count BEFORE sending
      const beforeCount = chatHookRef.current?.messages.length || 0;

      chatHookRef.current?.sendMessage({
        text: content,
        metadata: { timestamp },
      });
      if (threadStore) {
        // Wait for React to process the message addition
        setTimeout(() => {
          try {
            const state = threadStore.getState();
            const effectiveId = threadId ?? state.activeThreadId;
            if (effectiveId) {
              const afterCount = chatHookRef.current?.messages.length || 0;

              // Force persist if count increased (new message added)
              if (afterCount > beforeCount) {
                // Directly update store with new messages
                state.updateThreadMessages(
                  effectiveId,
                  chatHookRef.current?.messages as UIMessage[]
                );
              }
              // Initial placeholder title: first user message preview if untitled
              const refreshed = threadStore.getState();
              const record = refreshed.getRecord(effectiveId);
              if (record && !record.title) {
                const raw = String(content ?? "").trim();
                if (raw) {
                  const PREVIEW_LEN = 24;
                  let preview = raw.slice(0, PREVIEW_LEN);
                  if (raw.length > PREVIEW_LEN) {
                    const lastSpace = preview.lastIndexOf(" ");
                    if (lastSpace > 8) preview = preview.slice(0, lastSpace);
                    preview = preview + "…";
                  }
                  preview = preview
                    .replace(/[\n\r]+/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
                  if (preview) {
                    refreshed.renameThread(effectiveId, preview, {
                      allowAutoReplace: true,
                    });
                  }
                }
              }
            }
          } catch (error) {
            logDevError(
              "[acb][useMessageOperations] failed to persist thread state after sending message",
              error,
              showErrorMessages
            );
          }
        });
      }
    },
    [threadId, resetErrorState, threadStore, chatHookRef, showErrorMessages]
  );

  const sendAICommandMessage = useCallback(
    (content: string, toolName: string, commandSystemPrompt?: string) => {
      resetErrorState();

      // Filter tools to only include the specified tool (per-call override via body)
      const allTools = useAIToolsStore.getState().serializeToolsForBackend();
      const filteredTools = allTools.filter((tool) => tool.name === toolName);

      // Send message with per-call overrides
      const timestamp = Date.now();
      chatHookRef.current?.sendMessage(
        { text: content, metadata: { timestamp } },
        {
          body: {
            tools: filteredTools,
            systemPrompt: commandSystemPrompt || systemPromptRef.current,
          },
        }
      );
      if (threadStore) {
        queueMicrotask(() => {
          try {
            const state = threadStore.getState();
            const effectiveId = threadId ?? state.activeThreadId;
            if (effectiveId) {
              state.updateThreadMessages(
                effectiveId,
                chatHookRef.current?.messages as UIMessage[]
              );
            }
          } catch (error) {
            logDevError(
              "[acb][useMessageOperations] failed to persist thread state after command message",
              error,
              showErrorMessages
            );
          }
        });
      }
    },
    [threadId, resetErrorState, threadStore, chatHookRef, showErrorMessages]
  );

  const retryLastMessage = useCallback(() => {
    const lastMessage = chatHook.messages[chatHook.messages.length - 1];
    if (lastMessage?.role === "user") {
      const textPart = lastMessage.parts?.find((part) => part.type === "text");
      if (textPart && "text" in textPart) {
        sendMessageWithContext(textPart.text);
      }
    }
  }, [chatHook.messages, sendMessageWithContext]);

  const clearError = useCallback(() => {
    resetErrorState();
  }, [resetErrorState]);

  const applyPinnedStateToBatch = useCallback(
    (pins: CompressionPinnedMessage[]) => {
      const targetStates = new Map<string, CompressionMessagePinnedState>();
      pins.forEach((pin) => {
        const id = pin.message?.id ?? pin.id;
        if (!id) return;
        const pinnedAt =
          typeof pin.pinnedAt === "number" && Number.isFinite(pin.pinnedAt)
            ? pin.pinnedAt
            : Date.now();
        targetStates.set(id, {
          pinnedAt,
          pinnedBy: pin.pinnedBy,
          reason: pin.reason,
        });
      });

      const latestHook = getLatestChat();
      const currentMessages = latestHook.messages as UIMessage[];
      let changed = false;
      const nextMessages = currentMessages.map((current) => {
        if (!current?.id) return current;
        const nextState = targetStates.get(current.id) ?? null;
        const updated = withCompressionPinnedState(current, nextState);
        if (updated !== current) {
          changed = true;
          return updated;
        }
        return current;
      });

      if (changed) {
        latestHook.setMessages(nextMessages);
      }
    },
    [getLatestChat]
  );

  const clearAllPinnedStates = useCallback(() => {
    const latestHook = getLatestChat();
    const currentMessages = latestHook.messages as UIMessage[];
    let changed = false;
    const nextMessages = currentMessages.map((current) => {
      const updated = withCompressionPinnedState(current, null);
      if (updated !== current) {
        changed = true;
        return updated;
      }
      return current;
    });

    if (changed) {
      latestHook.setMessages(nextMessages);
    }
  }, [getLatestChat]);

  return {
    sendMessageWithContext,
    sendAICommandMessage,
    retryLastMessage,
    clearError,
    mutateMessageById,
    applyPinnedStateToMessage,
    applyPinnedStateToBatch,
    clearAllPinnedStates,
    getLatestChat,
  };
}
