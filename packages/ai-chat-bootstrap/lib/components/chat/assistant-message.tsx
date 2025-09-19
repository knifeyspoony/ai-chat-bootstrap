import type { UIMessage } from "ai";
import React from "react";
import isEqual from "fast-deep-equal";
import type { AssistantActionsConfig } from "../../types/actions";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "../../components/ai-elements/message";
import { cn } from "../../utils";
import { ChatChainOfThought } from "./chat-chain-of-thought";
import { ChatMessagePart } from "./chat-message-part";
import { AssistantActionsRenderer } from "./assistant-actions-renderer";

type MessagePart = UIMessage["parts"][number];

interface AssistantMessageProps {
  message: UIMessage;
  isStreaming: boolean;
  assistantAvatar?: string;
  messageClassName?: string;
  isLastMessage?: boolean;
  actions?: React.ReactNode;
  latestActions?: React.ReactNode;
  actionsClassName?: string;
  isLatestAssistant?: boolean;
  actionsConfig?: AssistantActionsConfig;
}

const AssistantMessageImpl: React.FC<AssistantMessageProps> = ({
  message,
  isStreaming,
  assistantAvatar = "/acb.png",
  messageClassName,
  isLastMessage,
  actions,
  latestActions,
  actionsClassName,
  isLatestAssistant,
  actionsConfig,
}) => {
  // Separate COT parts from regular parts
  const cotParts: MessagePart[] = [];
  const regularParts: MessagePart[] = [];
  let cotActive = false;

  // Helper: filter out non-visible parts
  const isVisiblePart = (part: MessagePart) => {
    // Filter out all acb_ tools (they render as null in ChatMessagePart)
    if (part.type?.startsWith("tool-acb_") || part.type === "dynamic-tool") {
      return false;
    }
    // Filter out step-start parts (they don't render content)
    if (part.type === "step-start") {
      return false;
    }
    // Filter out empty text parts
    if (part.type === "text" && (!part.text || part.text.trim() === "")) {
      return false;
    }
    // Filter out empty reasoning parts
    if (part.type === "reasoning" && (!part.text || part.text.trim() === "")) {
      return false;
    }
    return true;
  };

  message.parts?.forEach((part) => {
    if (part.type === "tool-acb_start_chain_of_thought") {
      cotActive = true;
      cotParts.push(part);
      return;
    }
    if (part.type === "tool-acb_complete_chain_of_thought" && cotActive) {
      cotParts.push(part);
      cotActive = false;
      return;
    }
    if (cotActive) {
      cotParts.push(part);
    } else {
      regularParts.push(part);
    }
  });

  const visibleRegularParts = regularParts.filter(isVisiblePart);
  const hasCOT = cotParts.length > 0;
  const hasRegularContent = visibleRegularParts.some((part) => {
    if (part.type === "text" || part.type === "reasoning") {
      return part.text && part.text.trim() !== "";
    }
    return true; // Other types (file, source-url, etc.) are considered content
  });

  // If no visible content at all, don't render anything
  if (!hasCOT && !hasRegularContent) {
    return null;
  }

  const hasSharedActions = Boolean(actions);
  const hasLatestActions = Boolean(latestActions);
  const hasConfigActions = Boolean(actionsConfig);
  const showAnyActions =
    hasSharedActions || (isLatestAssistant && hasLatestActions) || hasConfigActions;

  return (
    <div className={cn("group flex flex-col gap-0", !showAnyActions && "pt-4")}>
      <Message
        from="assistant"
        data-acb-part="message"
        data-role="assistant"
        className={cn(
          "[&_[data-acb-part=message-content]]:bg-[var(--acb-chat-message-assistant-bg)] [&_[data-acb-part=message-content]]:text-[var(--acb-chat-message-assistant-fg)]",
          messageClassName,
          "m-0"
        )}
      >
        <div className="flex flex-col gap-3 w-full">
          {/* Render COT first if present */}
          {hasCOT && (
            <div className="w-full overflow-x-auto">
              <ChatChainOfThought
                message={{ ...message, parts: cotParts }}
                isStreaming={isStreaming}
                isLastMessage={isLastMessage ?? false}
                className="max-w-full w-full"
              />
            </div>
          )}

          {/* Render regular message parts */}
          {hasRegularContent && (
            <MessageContent
              data-acb-part="message-content"
              className="rounded-[var(--acb-chat-message-radius)]"
            >
              {visibleRegularParts.map((part, partIndex) => (
                <ChatMessagePart
                  key={partIndex}
                  part={part}
                  streaming={isStreaming}
                />
              ))}
            </MessageContent>
          )}
        </div>
        <MessageAvatar
          data-acb-part="message-avatar"
          name="Assistant"
          src={assistantAvatar}
        />
      </Message>
      {showAnyActions ? (
        <div className="ml-2">
          <div
            data-acb-part="assistant-actions"
            className={cn(
              "flex flex-wrap items-center gap-1 pl-8 -mt-4 pb-4 text-xs text-muted-foreground transition-opacity duration-150",
              isLatestAssistant
                ? "opacity-100"
                : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto",
              actionsClassName
            )}
          >
            {/* Legacy JSX-based actions */}
            {actions}
            {isLatestAssistant && latestActions ? latestActions : null}

            {/* New config-based actions */}
            {hasConfigActions && (
              <AssistantActionsRenderer
                message={message}
                actionsConfig={actionsConfig}
                isLatestAssistant={isLatestAssistant}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const AssistantMessage = React.memo(
  AssistantMessageImpl,
  (prev, next) => {
    // Fast path: reference equality check
    if (prev.message === next.message &&
        prev.isStreaming === next.isStreaming &&
        prev.isLatestAssistant === next.isLatestAssistant) return true;

    // Detailed property comparison
    return (
      prev.message.id === next.message.id &&
      prev.isStreaming === next.isStreaming &&
      prev.isLastMessage === next.isLastMessage &&
      prev.isLatestAssistant === next.isLatestAssistant &&
      prev.assistantAvatar === next.assistantAvatar &&
      prev.messageClassName === next.messageClassName &&
      prev.actionsClassName === next.actionsClassName &&
      prev.actions === next.actions &&
      prev.latestActions === next.latestActions &&
      prev.actionsConfig === next.actionsConfig &&
      isEqual(prev.message.parts, next.message.parts)
    );
  }
);
