import type { UIMessage } from "ai";
import isEqual from "fast-deep-equal";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "../../components/ai-elements/message";
import { useAIBranchesStore } from "../../stores";
import type { AssistantActionsConfig } from "../../types/actions";
import { cn } from "../../utils";
import {
  Branch,
  BranchMessages,
  BranchNext,
  BranchPage,
  BranchPrevious,
  BranchSelector,
} from "../ai-elements/branch";
import { AssistantActionsRenderer } from "./assistant-actions-renderer";
import { buildAssistantBranchEntries } from "./assistant-branches";
import { getAssistantMessageSegments } from "./assistant-message-segments";
import { ChatChainOfThought } from "./chat-chain-of-thought";
import { ChatMessagePart } from "./chat-message-part";
import { ChatMessagePinToggle } from "./chat-message-pin-toggle";

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
  pinState?: {
    pinned: boolean;
    toggle: () => void;
  };
  branching?: {
    enabled: boolean;
    selectBranch?: (messageId: string, branchId: string) => void;
  };
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
  pinState,
  branching,
}) => {
  const branchingEnabled = branching?.enabled ?? false;
  const messageId = message.id;

  const selectedBranchId = useAIBranchesStore((state) =>
    messageId ? state.selection.get(messageId) : undefined
  );

  useEffect(() => {
    if (!branchingEnabled) return;
    if (!messageId) return;
    const store = useAIBranchesStore.getState();
    if (!store.selection.has(messageId)) {
      store.setSelectedBranch(messageId, messageId);
    }
  }, [branchingEnabled, messageId]);

  const renderMessageBody = useCallback(
    (
      baseMessage: UIMessage,
      options: { streaming: boolean; isLast: boolean }
    ): React.ReactElement | null => {
      const {
        chainOfThoughtParts,
        visibleRegularParts,
        hasChainOfThought,
        hasRegularContent,
      } = getAssistantMessageSegments(baseMessage);

      if (!hasChainOfThought && !hasRegularContent) {
        return null;
      }

      const showPinToggle = Boolean(pinState);

      return (
        <Message
          from="assistant"
          data-acb-part="message"
          data-role="assistant"
          data-acb-pinned={pinState?.pinned ? "" : undefined}
          className={cn(
            "[&_[data-acb-part=message-content]]:bg-[var(--acb-chat-message-assistant-bg)] [&_[data-acb-part=message-content]]:text-[var(--acb-chat-message-assistant-fg)]",
            messageClassName,
            "m-0"
          )}
        >
          <div className="relative flex w-full flex-col gap-3">
            {hasChainOfThought && (
              <div className="w-full overflow-x-auto">
                <ChatChainOfThought
                  message={{ ...baseMessage, parts: chainOfThoughtParts }}
                  isStreaming={options.streaming}
                  isLastMessage={options.isLast}
                  className="w-full max-w-full"
                />
              </div>
            )}

            {hasRegularContent && (
              <div className="flex items-start gap-2 w-full">
                <MessageContent
                  data-acb-part="message-content"
                  className="rounded-[var(--acb-chat-message-radius)] flex-1"
                >
                  {visibleRegularParts.map((part, partIndex) => (
                    <ChatMessagePart
                      key={partIndex}
                      part={part}
                      streaming={options.streaming}
                    />
                  ))}
                </MessageContent>
                {showPinToggle && (
                  <div className="flex items-center h-full pt-2">
                    <ChatMessagePinToggle
                      pinned={Boolean(pinState?.pinned)}
                      onPressedChange={() => pinState?.toggle()}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <MessageAvatar
            data-acb-part="message-avatar"
            name="Assistant"
            src={assistantAvatar}
          />
        </Message>
      );
    },
    [assistantAvatar, messageClassName, pinState]
  );

  const branchEntries = useMemo(
    () =>
      buildAssistantBranchEntries({
        message,
        isStreaming,
        isLastMessage,
        renderMessageBody,
      }),
    [isLastMessage, isStreaming, message, renderMessageBody]
  );

  const branchCount = branchEntries.length;

  const resolvedBranchId = branchingEnabled
    ? selectedBranchId ?? message.id
    : message.id;

  const defaultBranchIndexRaw = branchEntries.findIndex(
    (entry) => entry.message.id === resolvedBranchId
  );
  const defaultBranchIndex =
    defaultBranchIndexRaw === -1 && branchCount > 0
      ? branchCount - 1
      : Math.max(defaultBranchIndexRaw, 0);
  const branchKey = `${message.id ?? "assistant"}-${branchCount}`;

  const [activeBranchIndex, setActiveBranchIndex] =
    useState(defaultBranchIndex);

  useEffect(() => {
    setActiveBranchIndex(defaultBranchIndex);
  }, [branchKey, defaultBranchIndex]);

  const safeActiveIndex = Math.min(
    Math.max(activeBranchIndex, 0),
    branchCount - 1
  );

  const effectiveMessage = branchEntries[safeActiveIndex]?.message ?? message;
  const showBranchSelector = branchingEnabled && branchCount > 1;

  const hasSharedActions = Boolean(actions);
  const hasLatestActions = Boolean(latestActions);
  const hasConfigActions = Boolean(actionsConfig);
  const showAnyActions =
    hasSharedActions ||
    (isLatestAssistant && hasLatestActions) ||
    hasConfigActions;

  const actionsContent = showAnyActions ? (
    <div
      data-acb-part="assistant-actions"
      className={cn(
        "flex flex-wrap items-center gap-1 text-xs text-muted-foreground transition-opacity duration-150",
        isLatestAssistant
          ? "opacity-100"
          : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto",
        actionsClassName
      )}
    >
      {actions}
      {isLatestAssistant && latestActions ? latestActions : null}

      {hasConfigActions && (
        <AssistantActionsRenderer
          message={effectiveMessage}
          actionsConfig={actionsConfig}
          isLatestAssistant={isLatestAssistant}
        />
      )}
    </div>
  ) : null;

  const widthConstraintClass = "w-full max-w-[80%]";

  const renderControlsRow = (selectorEnabled: boolean) => {
    if (!showAnyActions && !selectorEnabled) {
      return null;
    }

    const controlsJustifyClass = (() => {
      if (selectorEnabled && showAnyActions) {
        return "justify-between";
      }
      if (selectorEnabled) {
        return "justify-end";
      }
      return "justify-start";
    })();

    return (
      <div className="flex w-full items-start gap-2 pb-4">
        {/* Avatar gutter spacer - matches the size-8 avatar + gap-2 from Message component */}
        <div aria-hidden="true" className="size-8 shrink-0" />
        <div
          className={cn(
            widthConstraintClass,
            "flex w-full flex-wrap items-start gap-3 pt-1",
            controlsJustifyClass
          )}
        >
          {showAnyActions ? (
            <div className="min-w-0 flex-1">{actionsContent}</div>
          ) : null}
          {selectorEnabled ? (
            <BranchSelector
              from="assistant"
              alignment="inline"
              className="mt-1 shrink-0"
            >
              <BranchPrevious />
              <BranchPage />
              <BranchNext />
            </BranchSelector>
          ) : null}
        </div>
      </div>
    );
  };

  const containerClass = cn(
    "group flex flex-col gap-0",
    !showAnyActions && !showBranchSelector && "pt-4",
    (showAnyActions || showBranchSelector) && "[&>div]:pb-0"
  );

  const handleBranchChange = useCallback(
    (nextIndex: number) => {
      if (isStreaming) return;
      setActiveBranchIndex(nextIndex);
      if (!branchingEnabled) return;
      if (!branching?.selectBranch) return;
      if (!messageId) return;
      const target = branchEntries[nextIndex];
      const targetId = target?.message.id;
      if (!targetId) return;
      branching.selectBranch(messageId, targetId);
    },
    [branchEntries, branching, branchingEnabled, isStreaming, messageId]
  );

  const canonicalContent = useMemo(() => {
    if (branchEntries.length === 0) return null;
    return (
      branchEntries.find((entry) => entry.message.id === message.id) ??
      branchEntries[branchEntries.length - 1]
    )?.content;
  }, [branchEntries, message.id]);

  if (branchCount === 0) {
    return null;
  }

  const messageContent = showBranchSelector ? (
    <Branch
      key={branchKey}
      defaultBranch={defaultBranchIndex}
      onBranchChange={handleBranchChange}
      className="flex flex-col gap-0"
    >
      <BranchMessages>
        {branchEntries.map((entry) => (
          <React.Fragment key={entry.key}>{entry.content}</React.Fragment>
        ))}
      </BranchMessages>
      {renderControlsRow(true)}
    </Branch>
  ) : (
    <>
      {canonicalContent}
      {renderControlsRow(false)}
    </>
  );

  return <div className={containerClass}>{messageContent}</div>;
};

export const AssistantMessage = React.memo(
  AssistantMessageImpl,
  (prev, next) => {
    // Fast path: reference equality check
    if (
      prev.message === next.message &&
      prev.isStreaming === next.isStreaming &&
      prev.isLatestAssistant === next.isLatestAssistant &&
      prev.pinState?.pinned === next.pinState?.pinned
    )
      return true;

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
      prev.pinState?.pinned === next.pinState?.pinned &&
      isEqual(prev.message.parts, next.message.parts) &&
      isEqual(prev.message.metadata, next.message.metadata)
    );
  }
);
