import type { UIMessage } from "ai";
import type { RefObject } from "react";
import { useCallback, useEffect } from "react";
import { useAIBranchesStore, useAICompressionStore } from "../stores";
import {
  appendMessageBranchVersion,
  getMessageBranchMetadata,
  MESSAGE_BRANCH_METADATA_KEY,
  promoteMessageBranch,
  type MessageBranchMetadata,
} from "../utils/message-branches";
import type { ChatHelpers } from "./use-ai-chat";

export interface UseAIChatBranchingOptions {
  enabled: boolean;
  chatHook: ChatHelpers;
  chatHookRef: RefObject<ChatHelpers | null>;
  persistMessagesIfChanged: (reason?: string) => void;
}

export interface UseAIChatBranchingResult {
  enabled: boolean;
  selectBranch: (messageId: string, branchId: string) => void;
  regenerate: ChatHelpers["regenerate"];
}

function ensureAssistantMessage(message: UIMessage | undefined) {
  return message && message.role === "assistant" ? message : undefined;
}

function hasRenderableParts(message: UIMessage) {
  return Array.isArray(message.parts) && message.parts.length > 0;
}

export function useAIChatBranching({
  enabled,
  chatHook,
  chatHookRef,
  persistMessagesIfChanged,
}: UseAIChatBranchingOptions): UseAIChatBranchingResult {
  useEffect(() => {
    const store = useAIBranchesStore.getState();

    if (!enabled) {
      if (store.selection.size > 0) {
        store.reset();
      }
      return;
    }

    const existingIds = new Set(
      chatHook.messages
        .map((message) => message.id)
        .filter((id): id is string => Boolean(id))
    );

    if (existingIds.size === 0 && store.selection.size > 0) {
      store.reset();
      return;
    }

    store.selection.forEach((_, messageId) => {
      if (!existingIds.has(messageId)) {
        store.clearSelectedBranch(messageId);
      }
    });

    chatHook.messages.forEach((message) => {
      if (message.role !== "assistant") return;
      if (!message.id) return;
      if (!store.selection.has(message.id)) {
        store.setSelectedBranch(message.id, message.id);
      }
    });
  }, [enabled, chatHook.messages]);

  const selectBranch = useCallback(
    (messageId: string, branchId: string) => {
      if (!enabled) return;
      if (!messageId) return;

      const helper = chatHookRef.current ?? chatHook;

      let promotedMessage: UIMessage | null = null;
      let promotedMessageId: string | null = null;

      helper.setMessages((prevMessages) => {
        if (!Array.isArray(prevMessages) || prevMessages.length === 0) {
          return prevMessages;
        }

        const targetIndex = prevMessages.findIndex(
          (msg) => msg.id === messageId
        );
        if (targetIndex === -1) {
          return prevMessages;
        }

        const targetMessage = ensureAssistantMessage(prevMessages[targetIndex]);
        if (!targetMessage) {
          return prevMessages;
        }

        const generatorBase = targetMessage.id ?? `assistant-${targetIndex}`;
        const result = promoteMessageBranch(targetMessage, branchId, {
          createId: (count) => `${generatorBase}::v${count + 1}`,
        });

        if (!result.changed) {
          promotedMessage = targetMessage;
          promotedMessageId = targetMessage.id ?? null;
          return prevMessages;
        }

        promotedMessage = result.updatedMessage;
        promotedMessageId = result.updatedMessage.id ?? null;

        const nextMessages = prevMessages.slice();
        nextMessages[targetIndex] = result.updatedMessage;
        return nextMessages;
      });

      const branchesStore = useAIBranchesStore.getState();
      branchesStore.setSelectedBranch(
        messageId,
        branchId || promotedMessageId || messageId
      );

      if (promotedMessage) {
        const compressionState = useAICompressionStore.getState();
        const existingPin = compressionState.pinnedMessages.get(messageId);
        if (existingPin) {
          compressionState.pinMessage(promotedMessage, {
            pinnedAt: existingPin.pinnedAt,
            pinnedBy: existingPin.pinnedBy,
            reason: existingPin.reason,
          });
        }
      }

      queueMicrotask(() => {
        try {
          persistMessagesIfChanged("branch-select");
        } catch {
          /* ignore */
        }
      });
    },
    [enabled, chatHook, chatHookRef, persistMessagesIfChanged]
  );

  const regenerateWithHistory = useCallback<ChatHelpers["regenerate"]>(
    async (options) => {
      const helper = chatHookRef.current ?? chatHook;

      if (!enabled) {
        return helper.regenerate(options);
      }

      let targetIndex = -1;
      let previousMetadata: MessageBranchMetadata | undefined;
      let appendedMetadata: MessageBranchMetadata | undefined;
      let targetMessageId: string | undefined;

      helper.setMessages((prevMessages) => {
        if (!Array.isArray(prevMessages) || prevMessages.length === 0) {
          return prevMessages;
        }

        const explicitId = options?.messageId;
        let resolvedIndex = -1;

        if (explicitId) {
          resolvedIndex = prevMessages.findIndex(
            (msg) => msg.id === explicitId
          );
        }

        if (resolvedIndex === -1) {
          for (let i = prevMessages.length - 1; i >= 0; i -= 1) {
            const candidate = ensureAssistantMessage(prevMessages[i]);
            if (candidate) {
              resolvedIndex = i;
              break;
            }
          }
        }

        if (resolvedIndex === -1) {
          return prevMessages;
        }

        const targetMessage = ensureAssistantMessage(
          prevMessages[resolvedIndex]
        );
        if (!targetMessage) {
          return prevMessages;
        }

        targetMessageId = targetMessage.id ?? undefined;

        if (!hasRenderableParts(targetMessage)) {
          return prevMessages;
        }

        const baseId = targetMessage.id ?? `assistant-${resolvedIndex}`;
        const { updatedMessage } = appendMessageBranchVersion(
          targetMessage,
          (count) => `${baseId}::v${count + 1}`
        );

        targetIndex = resolvedIndex;
        previousMetadata = getMessageBranchMetadata(targetMessage);
        appendedMetadata = getMessageBranchMetadata(updatedMessage);

        const nextMessages = prevMessages.slice();
        nextMessages[resolvedIndex] = updatedMessage;
        return nextMessages;
      });

      if (targetIndex === -1 || !appendedMetadata) {
        return helper.regenerate(options);
      }

      const applyBranchMetadata = (messages: UIMessage[]) => {
        if (!Array.isArray(messages)) return messages;
        if (targetIndex < 0 || targetIndex >= messages.length) {
          return messages;
        }
        const nextMessages = messages.slice();
        const targetMessage = ensureAssistantMessage(nextMessages[targetIndex]);
        if (!targetMessage) {
          return messages;
        }
        const metadata = {
          ...(targetMessage.metadata ?? {}),
          [MESSAGE_BRANCH_METADATA_KEY]: appendedMetadata,
        };
        nextMessages[targetIndex] = {
          ...targetMessage,
          metadata,
        };
        return nextMessages;
      };

      const restoreBranchMetadata = (messages: UIMessage[]) => {
        if (!Array.isArray(messages)) return messages;
        if (targetIndex < 0 || targetIndex >= messages.length) {
          return messages;
        }
        const nextMessages = messages.slice();
        const targetMessage = ensureAssistantMessage(nextMessages[targetIndex]);
        if (!targetMessage) {
          return messages;
        }
        const metadata = { ...(targetMessage.metadata ?? {}) } as Record<
          string,
          unknown
        >;
        if (previousMetadata && previousMetadata.versions.length > 0) {
          metadata[MESSAGE_BRANCH_METADATA_KEY] = previousMetadata;
        } else {
          delete metadata[MESSAGE_BRANCH_METADATA_KEY];
        }

        const hasMetadata = Object.keys(metadata).length > 0;
        nextMessages[targetIndex] = {
          ...targetMessage,
          metadata: hasMetadata ? metadata : undefined,
        };
        return nextMessages;
      };

      try {
        const result = await helper.regenerate(options);

        helper.setMessages((prev) => applyBranchMetadata(prev));

        queueMicrotask(() => {
          try {
            persistMessagesIfChanged("regenerate-history");

            if (targetMessageId) {
              const compressionState = useAICompressionStore.getState();
              const existingPin =
                compressionState.pinnedMessages.get(targetMessageId);
              if (existingPin) {
                const latestHelper = chatHookRef.current ?? chatHook;
                const latestMessage = latestHelper.messages.find(
                  (msg) => msg.id === targetMessageId
                );
                if (latestMessage) {
                  compressionState.pinMessage(latestMessage, {
                    pinnedAt: existingPin.pinnedAt,
                    pinnedBy: existingPin.pinnedBy,
                    reason: existingPin.reason,
                  });
                }
              }
            }
          } catch {
            /* ignore */
          }
        });

        return result;
      } catch (error) {
        helper.setMessages((prev) => restoreBranchMetadata(prev));

        queueMicrotask(() => {
          try {
            persistMessagesIfChanged("regenerate-rollback");
          } catch {
            /* ignore */
          }
        });

        throw error;
      }
    },
    [enabled, chatHook, chatHookRef, persistMessagesIfChanged]
  );

  return {
    enabled,
    selectBranch,
    regenerate: regenerateWithHistory,
  };
}
