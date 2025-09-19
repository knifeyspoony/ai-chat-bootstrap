import { type UIMessage } from "ai";
import isEqual from "fast-deep-equal";
import { MessageSquare, UserIcon } from "lucide-react";
import React, { forwardRef, useImperativeHandle, useMemo } from "react";
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
import { cn } from "../../utils";
import { AssistantMessage } from "./assistant-message";
import { ChatMessagePart } from "./chat-message-part";

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
}

export interface ChatMessagesHandle {
  scrollToBottom: () => void;
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
    },
    ref
  ) => {
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
                    />
                  );
                }
                return (
                  <ChatMessageItem
                    key={message.id ?? index}
                    message={message}
                    isStreaming={isStreamingLast}
                    assistantAvatar={assistantAvatar}
                    userAvatar={userAvatar}
                    messageClassName={messageClassName}
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
}

const ChatMessageItem = React.memo(
  function ChatMessageItem({
    message,
    isStreaming,
    assistantAvatar,
    userAvatar,
    messageClassName,
  }: ChatMessageItemProps) {
    const isUser = message.role === "user";
    const isSystem = message.role === "system";

    if (isSystem) {
      const firstPart = message.parts?.[0];
      const systemText =
        firstPart && "text" in firstPart ? firstPart.text : "System message";
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

    return (
      <Message
        from={message.role}
        data-acb-part="message"
        data-role={message.role}
        className={cn(
          "[&_[data-acb-part=message-content]]:bg-[var(--acb-chat-message-assistant-bg)] [&_[data-acb-part=message-content]]:text-[var(--acb-chat-message-assistant-fg)]",
          message.role === "user" &&
            "[&_[data-acb-part=message-content]]:bg-[var(--acb-chat-message-user-bg)] [&_[data-acb-part=message-content]]:text-[var(--acb-chat-message-user-fg)]",
          message.role === "system" &&
            "[&_[data-acb-part=message-content]]:bg-[var(--acb-chat-message-system-bg)] [&_[data-acb-part=message-content]]:text-[var(--acb-chat-message-system-fg)]",
          messageClassName
        )}
      >
        <MessageContent
          data-acb-part="message-content"
          className={cn("rounded-[var(--acb-chat-message-radius)]")}
        >
          {message.parts?.map((part, partIndex: number) => (
            <ChatMessagePart
              key={partIndex}
              part={part}
              streaming={isStreaming}
            />
          ))}
        </MessageContent>
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
    if (prev.message === next.message && prev.isStreaming === next.isStreaming)
      return true;

    // Detailed property comparison
    return (
      prev.message.id === next.message.id &&
      prev.message.role === next.message.role &&
      prev.isStreaming === next.isStreaming &&
      prev.assistantAvatar === next.assistantAvatar &&
      prev.userAvatar === next.userAvatar &&
      prev.messageClassName === next.messageClassName &&
      isEqual(prev.message.parts, next.message.parts)
    );
  }
);
