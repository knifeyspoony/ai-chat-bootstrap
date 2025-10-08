import { type UIMessage } from "ai";
import isEqual from "fast-deep-equal";
import { MessageSquare, UserIcon } from "lucide-react";
import React, { forwardRef, useEffect, useImperativeHandle, useMemo } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "../../components/ai-elements/conversation";
import { Loader } from "../../components/ai-elements/loader";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "../../components/ai-elements/message";
import { Badge } from "../../components/ui/badge";
import type { AssistantActionsConfig } from "../../types/actions";
import type { CompressionController, CompressionUsage } from "../../types/compression";
import { normalizeCompressionConfig } from "../../types/compression";
import { cn } from "../../utils";
import { AssistantMessage } from "./assistant-message";
import { ChatMessagePinToggle } from "./chat-message-pin-toggle";
import { ChatMessagePart } from "./chat-message-part";
import { buildCompressionPayload } from "../../utils/compression/build-payload";
import { getCompressionMessageCompressionState } from "../../utils/compression/message-metadata";

const tokenNumberFormatter = typeof Intl !== "undefined"
  ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
  : null;

function formatTokenNumber(value: number): string {
  const safeValue = Math.max(0, Math.round(value));
  return tokenNumberFormatter ? tokenNumberFormatter.format(safeValue) : `${safeValue}`;
}

function buildCompressionSummary(systemText?: string | null): string | null {
  if (!systemText) return null;

  const tokensLine = systemText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.toLowerCase().startsWith("tokens:"));

  if (!tokensLine) return null;

  const beforeMatch = tokensLine.match(/before\s+(\d+(?:\.\d+)?)/i);
  const afterMatch = tokensLine.match(/after\s+(\d+(?:\.\d+)?)/i);
  const savedMatch = tokensLine.match(/saved\s+(\d+(?:\.\d+)?)/i);

  const before = beforeMatch ? Number(beforeMatch[1]) : undefined;
  const after = afterMatch ? Number(afterMatch[1]) : undefined;
  const saved = savedMatch ? Number(savedMatch[1]) : undefined;

  if (
    (before === undefined || Number.isNaN(before)) &&
    (after === undefined || Number.isNaN(after)) &&
    (saved === undefined || Number.isNaN(saved))
  ) {
    return null;
  }

  const hasBefore = typeof before === "number" && Number.isFinite(before);
  const hasAfter = typeof after === "number" && Number.isFinite(after);
  const hasSaved = typeof saved === "number" && Number.isFinite(saved);

  if (hasBefore && hasAfter) {
    const parts: string[] = [
      `from ${formatTokenNumber(before)} tokens to ${formatTokenNumber(after)} tokens`,
    ];

    if (before > 0) {
      const reduction = Math.max(0, Math.min(1, (before - after) / before));
      if (Number.isFinite(reduction) && reduction > 0) {
        const percentage = reduction * 100;
        const rounded =
          percentage >= 10
            ? Math.round(percentage)
            : Math.round(percentage * 10) / 10;
        parts.push(`(${rounded}% reduction)`);
      }
    }

    return parts.join(" ");
  }

  if (hasSaved) {
    if (hasBefore && before > 0) {
      const afterComputed = Math.max(before - (saved ?? 0), 0);
      return `saved ${formatTokenNumber(saved!)} tokens (now ${formatTokenNumber(afterComputed)} tokens)`;
    }
    return `saved ${formatTokenNumber(saved!)} tokens`;
  }

  if (hasAfter) {
    return `now ${formatTokenNumber(after!)} tokens`;
  }

  return null;
}

export interface ChatMessagesProps {
  messages: UIMessage[];
  assistantAvatar?: string;
  userAvatar?: string;
  isLoading?: boolean;
  className?: string;
  messageClassName?: string;
  emptyState?: React.ReactNode;
  threadId?: string;
  useChainOfThought?: boolean; // Feature flag to toggle between old and new UI
  assistantActionsClassName?: string;
  assistantActionsConfig?: AssistantActionsConfig;
  compression?: CompressionController;
  branching?: {
    enabled: boolean;
    selectBranch?: (
      messageId: string,
      branchId: string,
      branchIndex: number
    ) => void;
  };
}

export interface ChatMessagesHandle {
  scrollToBottom: () => void;
}

function compressionUsageEquals(
  previous: CompressionUsage | null | undefined,
  next: CompressionUsage
): boolean {
  if (!previous) return false;
  return (
    previous.totalTokens === next.totalTokens &&
    previous.pinnedTokens === next.pinnedTokens &&
    previous.artifactTokens === next.artifactTokens &&
    previous.survivingTokens === next.survivingTokens &&
    (previous.remainingTokens ?? null) === (next.remainingTokens ?? null) &&
    (previous.budget ?? null) === (next.budget ?? null) &&
    (previous.estimatedResponseTokens ?? null) ===
      (next.estimatedResponseTokens ?? null)
  );
}

const ChatMessagesInner = forwardRef<ChatMessagesHandle, ChatMessagesProps>(
  (
    {
      messages,
      isLoading = false,
      className,
      messageClassName,
      emptyState,
      assistantAvatar = "/acb.png",
      userAvatar,
      assistantActionsClassName,
      assistantActionsConfig,
      compression,
      branching,
    },
    ref
  ) => {
    const usageSignatureRef = React.useRef<string | null>(null);

    const defaultEmptyState = (
      <div className="flex items-center justify-center h-full text-center p-8 animate-in fade-in duration-500">
        <div className="text-muted-foreground space-y-4">
          <div className="flex justify-center">
            <MessageSquare className="h-12 w-12 opacity-60" />
          </div>
          <div className="space-y-2">
            <p className="text-sm">Send a message to get started</p>
          </div>
        </div>
      </div>
    );

    // Memoize filtered messages so unchanged array reference skips work in render phase
    const filteredMessages = useMemo(() => {
      return messages.filter((message) => {
        if (message.role === "assistant") {
          const hasContent = message.parts?.some(
            (part) =>
              (part.type === "text" && part.text?.trim()) ||
              (part.type === "reasoning" && part.text?.trim()) ||
              (part.type?.startsWith("tool-") &&
                !part.type?.startsWith("tool-acb")) ||
              part.type?.startsWith("data-") ||
              part.type === "file" ||
              part.type === "source-url" ||
              part.type === "source-document"
          );
          return hasContent;
        }
        return true;
      });
    }, [messages]);

    const latestAssistantIndex = useMemo(() => {
      for (let i = filteredMessages.length - 1; i >= 0; i -= 1) {
        if (filteredMessages[i]?.role === "assistant") {
          return i;
        }
      }
      return -1;
    }, [filteredMessages]);

    const lastMessage = messages[messages.length - 1];

    const compressionConfig = compression?.config;
    const normalizedCompressionConfig = useMemo(
      () => normalizeCompressionConfig(compressionConfig),
      [compressionConfig]
    );
    const compressionEnabled = Boolean(compressionConfig?.enabled);
    const pinnedMessages = compression?.pinnedMessages;
    const pinnedSet = useMemo(() => {
      const pins = pinnedMessages ?? [];
      const ids = pins
        .map((pin) => pin.message.id)
        .filter((id): id is string => Boolean(id));
      return new Set(ids);
    }, [pinnedMessages]);

    useEffect(() => {
      if (!compression) return;

      const payload = buildCompressionPayload({
        baseMessages: messages,
        pinnedMessages: compression.pinnedMessages ?? [],
        artifacts: compression.artifacts ?? [],
        snapshot: compression.snapshot ?? null,
        config: normalizedCompressionConfig,
      });

      const usageMatches = compressionUsageEquals(
        compression.usage,
        payload.usage
      );

      const shouldUpdateFlags =
        compression.shouldCompress !== payload.shouldCompress ||
        compression.overBudget !== payload.overBudget;

      const usageSignature =
        payload.usage == null
          ? "null"
          : [
              payload.usage.totalTokens,
              payload.usage.pinnedTokens,
              payload.usage.artifactTokens,
              payload.usage.survivingTokens,
              payload.usage.remainingTokens ?? "x",
              payload.usage.budget ?? "x",
              payload.usage.estimatedResponseTokens ?? "x",
            ].join("|");

      if (usageMatches && !shouldUpdateFlags) {
        usageSignatureRef.current = usageSignature;
        return;
      }

      if (
        usageSignatureRef.current === usageSignature &&
        !shouldUpdateFlags
      ) {
        usageSignatureRef.current = usageSignature;
        return;
      }

      const nextUsage = usageMatches ? compression.usage : payload.usage;

      compression.actions.setUsage(nextUsage ?? payload.usage, {
        shouldCompress: payload.shouldCompress,
        overBudget: payload.overBudget,
      });
      usageSignatureRef.current = usageSignature;
    }, [
      compression,
      compression?.pinnedMessages,
      compression?.artifacts,
      compression?.snapshot,
      compression?.usage,
      compression?.shouldCompress,
      compression?.overBudget,
      messages,
      normalizedCompressionConfig,
    ]);

    return (
      <Conversation className={cn("flex-1 text-left", className)}>
        <ConversationContent>
          {filteredMessages.length === 0
            ? emptyState || defaultEmptyState
            : filteredMessages.map((message, index) => {
                const isStreamingLast =
                  isLoading &&
                  message === lastMessage &&
                  message.role === "assistant";

                if (message.role === "assistant") {
                  const isLatestAssistantMessage =
                    index === latestAssistantIndex;
                  const messageId = message.id;
                  const canTogglePin =
                    compressionEnabled && typeof messageId === "string";
                  const isPinned =
                    canTogglePin && messageId && pinnedSet.has(messageId);
                  const togglePin = () => {
                    if (!compression || !messageId) return;
                    if (isPinned) {
                      compression.actions.unpinMessage(messageId);
                    } else {
                      compression.actions.pinMessage(message, {
                        pinnedBy: "user",
                      });
                    }
                  };
                  return (
                    <AssistantMessage
                      key={message.id ?? index}
                      message={message}
                      isStreaming={isStreamingLast}
                      assistantAvatar={assistantAvatar}
                      messageClassName={messageClassName}
                      isLastMessage={index === filteredMessages.length - 1}
                      isLatestAssistant={isLatestAssistantMessage}
                      actionsClassName={assistantActionsClassName}
                      actionsConfig={assistantActionsConfig}
                      branching={branching}
                      pinState={
                        canTogglePin
                          ? {
                              pinned: Boolean(isPinned),
                              toggle: togglePin,
                            }
                          : undefined
                      }
                    />
                  );
                }
                const messageId = message.id;
                const canTogglePin =
                  compressionEnabled && typeof messageId === "string";
                const isPinned =
                  canTogglePin && messageId && pinnedSet.has(messageId);
                const togglePin = () => {
                  if (!compression || !messageId) return;
                  if (isPinned) {
                    compression.actions.unpinMessage(messageId);
                  } else {
                    compression.actions.pinMessage(message, {
                      pinnedBy: "user",
                    });
                  }
                };
                return (
                  <ChatMessageItem
                    key={message.id ?? index}
                    message={message}
                    isStreaming={isStreamingLast}
                    assistantAvatar={assistantAvatar}
                    userAvatar={userAvatar}
                    messageClassName={messageClassName}
                    pinState={
                      canTogglePin
                        ? {
                            pinned: Boolean(isPinned),
                            toggle: togglePin,
                          }
                        : undefined
                    }
                  />
                );
              })}
          {isLoading && !lastMessage && (
            <Message
              from="assistant"
              data-acb-part="message"
              data-role="assistant"
              className="[&_[data-acb-part=message-content]]:bg-[var(--acb-chat-message-assistant-bg)] [&_[data-acb-part=message-content]]:text-[var(--acb-chat-message-assistant-fg)]"
            >
              <MessageContent
                data-acb-part="message-content"
                className="rounded-[var(--acb-chat-message-radius)]"
              >
                <Loader />
              </MessageContent>
              <MessageAvatar
                data-acb-part="message-avatar"
                name="Assistant"
                src={assistantAvatar}
              />
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
        <StickToBottomConnector ref={ref} />
      </Conversation>
    );
  }
);

const StickToBottomConnector = forwardRef<ChatMessagesHandle>(
  function StickToBottomConnector(_props, ref) {
    const { scrollToBottom } = useStickToBottomContext();
    useImperativeHandle(
      ref,
      () => ({
        scrollToBottom: () => {
          try {
            scrollToBottom();
          } catch {
            // no-op
          }
        },
      }),
      [scrollToBottom]
    );
    return null;
  }
);

export const ChatMessages = React.memo(ChatMessagesInner);

ChatMessagesInner.displayName = "ChatMessages";

interface ChatMessageItemProps {
  message: UIMessage;
  isStreaming: boolean;
  assistantAvatar?: string;
  userAvatar?: string;
  messageClassName?: string;
  pinState?: {
    pinned: boolean;
    toggle: () => void;
  };
}

const ChatMessageItem = React.memo(
  function ChatMessageItem({
    message,
    isStreaming,
    assistantAvatar,
    userAvatar,
    messageClassName,
    pinState,
  }: ChatMessageItemProps) {
    const isUser = message.role === "user";
    const isSystem = message.role === "system";

    if (isSystem) {
      const firstPart = message.parts?.[0];
      const systemText =
        firstPart && "text" in firstPart ? firstPart.text : "System message";
      const compressionState =
        getCompressionMessageCompressionState(message);
      const isCompressionEvent =
        compressionState?.kind === "event" &&
        compressionState.reason === "compression-event";

      if (isCompressionEvent) {
        const summary = buildCompressionSummary(systemText);
        const label = summary
          ? `Conversation was compressed — ${summary}`
          : "Conversation was compressed";
        return (
          <div
            className={cn(
              "flex w-full justify-center px-6 py-4 text-center",
              messageClassName
            )}
            title={systemText || undefined}
          >
            <span className="rounded-full bg-[var(--acb-chat-message-system-bg)]/70 px-3 py-1 text-xs text-muted-foreground">
              {label}
            </span>
          </div>
        );
      }

      return (
        <div
          className={cn(
            "flex justify-center px-6 py-4 w-full",
            messageClassName
          )}
        >
          <Badge variant="outline" className="text-xs">
            {systemText}
          </Badge>
        </div>
      );
    }

    const showPinToggle = Boolean(pinState);

    return (
      <Message
        from={message.role}
        data-acb-part="message"
        data-role={message.role}
        data-acb-pinned={pinState?.pinned ? "" : undefined}
        className={cn(
          "[&_[data-acb-part=message-content]]:bg-[var(--acb-chat-message-assistant-bg)] [&_[data-acb-part=message-content]]:text-[var(--acb-chat-message-assistant-fg)]",
          message.role === "user" &&
            "[&_[data-acb-part=message-content]]:bg-[var(--acb-chat-message-user-bg)] [&_[data-acb-part=message-content]]:text-[var(--acb-chat-message-user-fg)]",
          message.role === "system" &&
            "[&_[data-acb-part=message-content]]:bg-[var(--acb-chat-message-system-bg)] [&_[data-acb-part=message-content]]:text-[var(--acb-chat-message-system-fg)]",
          messageClassName
        )}
      >
        <div
          className={cn(
            "flex min-w-0 items-stretch gap-2",
            isUser ? "flex-row-reverse" : undefined
          )}
        >
          <MessageContent
            data-acb-part="message-content"
            data-acb-pinned={pinState?.pinned ? "" : undefined}
            className={cn("min-w-0 rounded-[var(--acb-chat-message-radius)]")}
          >
            {message.parts?.map((part, partIndex: number) => (
              <ChatMessagePart
                key={partIndex}
                part={part}
                streaming={isStreaming}
              />
            ))}
          </MessageContent>
          {showPinToggle && (
            <div
              className={cn(
                "flex shrink-0 items-center self-stretch transition-opacity duration-150",
                pinState?.pinned
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100 group-hover:pointer-events-auto group-focus-within:pointer-events-auto"
              )}
            >
              <ChatMessagePinToggle
                pinned={Boolean(pinState?.pinned)}
                onPressedChange={(next) => {
                  if (!pinState) return;
                  if (next === pinState.pinned) return;
                  pinState.toggle();
                }}
              />
            </div>
          )}
        </div>
        <MessageAvatar
          data-acb-part="message-avatar"
          name={isUser ? "You" : "Assistant"}
          src={isUser ? userAvatar || <UserIcon size={24} /> : assistantAvatar}
        />
      </Message>
    );
  },
  (prev, next) => {
    // Fast path: reference equality check
    if (
      prev.message === next.message &&
      prev.isStreaming === next.isStreaming &&
      prev.pinState?.pinned === next.pinState?.pinned
    )
      return true;

    // Detailed property comparison
    return (
      prev.message.id === next.message.id &&
      prev.message.role === next.message.role &&
      prev.isStreaming === next.isStreaming &&
      prev.assistantAvatar === next.assistantAvatar &&
      prev.userAvatar === next.userAvatar &&
      prev.messageClassName === next.messageClassName &&
      prev.pinState?.pinned === next.pinState?.pinned &&
      isEqual(prev.message.parts, next.message.parts)
    );
  }
);
