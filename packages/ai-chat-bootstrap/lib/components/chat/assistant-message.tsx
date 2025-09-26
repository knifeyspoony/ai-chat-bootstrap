import type { UIMessage } from "ai";
import isEqual from "fast-deep-equal";
import React, { useCallback, useEffect, useMemo } from "react";
import {
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
import { reorderBranchEntriesForSelection } from "./assistant-message-helpers";
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
    selectBranch?: (
      messageId: string,
      branchId: string,
      branchIndex: number
    ) => void;
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
  const selectedBranchIndex = useAIBranchesStore((state) =>
    messageId ? state.selectionIndex.get(messageId) : undefined
  );

  useEffect(() => {
    if (!branchingEnabled) return;
    if (!messageId) return;
    const store = useAIBranchesStore.getState();
    if (!store.selection.has(messageId)) {
      store.setSelectedBranch(messageId, messageId);
    }
  }, [branchingEnabled, messageId]);

  const handlePinPressedChange = useCallback(
    (next: boolean) => {
      if (!pinState) return;
      if (next === pinState.pinned) return;
      pinState.toggle();
    },
    [pinState]
  );

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
        <div className="flex items-start gap-2">
          <MessageAvatar
            data-acb-part="message-avatar"
            name="Assistant"
            src={assistantAvatar}
            className="shrink-0"
          />
          <div className="flex flex-col gap-3">
            {hasChainOfThought && (
              <div className="overflow-x-auto">
                <ChatChainOfThought
                  message={{ ...baseMessage, parts: chainOfThoughtParts }}
                  isStreaming={options.streaming}
                  isLastMessage={options.isLast}
                  className="w-full max-w-full"
                />
              </div>
            )}

            {hasRegularContent && (
              <div className="flex items-stretch gap-2">
                <MessageContent
                  data-acb-part="message-content"
                  data-role="assistant"
                  data-acb-pinned={pinState?.pinned ? "" : undefined}
                  className={cn(
                    "min-w-0 rounded-[var(--acb-chat-message-radius)] bg-[var(--acb-chat-message-assistant-bg)] text-[var(--acb-chat-message-assistant-fg)]",
                    messageClassName
                  )}
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
                      onPressedChange={handlePinPressedChange}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    },
    [assistantAvatar, handlePinPressedChange, messageClassName, pinState]
  );

  const rawBranchEntries = useMemo(
    () =>
      buildAssistantBranchEntries({
        message,
        isStreaming,
        isLastMessage,
        renderMessageBody,
      }),
    [isLastMessage, isStreaming, message, renderMessageBody]
  );

  const branchEntries = useMemo(
    () =>
      reorderBranchEntriesForSelection({
        entries: rawBranchEntries,
        messageId: message.id,
        branchingEnabled,
        selectedBranchIndex,
      }),
    [
      branchingEnabled,
      message.id,
      rawBranchEntries,
      selectedBranchIndex,
    ]
  );

  const branchCount = branchEntries.length;

  const normalizedSelectedBranchIndex =
    branchCount > 0 &&
    typeof selectedBranchIndex === "number" &&
    Number.isFinite(selectedBranchIndex)
      ? Math.max(
          0,
          Math.min(branchCount - 1, Math.trunc(selectedBranchIndex))
        )
      : undefined;

  const resolvedBranchId = branchingEnabled
    ? selectedBranchId ?? message.id
    : message.id;

  const defaultBranchIndexRaw = branchEntries.findIndex(
    (entry) => entry.message.id === resolvedBranchId
  );
  const fallbackBranchIndex =
    defaultBranchIndexRaw === -1
      ? normalizedSelectedBranchIndex ?? (branchCount > 0 ? branchCount - 1 : 0)
      : defaultBranchIndexRaw;
  const defaultBranchIndex =
    defaultBranchIndexRaw === -1
      ? fallbackBranchIndex
      : Math.max(defaultBranchIndexRaw, 0);
  const branchKey = `${message.id ?? "assistant"}-${branchCount}`;

  const effectiveBranchEntry = useMemo(() => {
    if (branchEntries.length === 0) return undefined;

    if (!branchingEnabled) {
      return branchEntries[branchEntries.length - 1];
    }

    const matchedEntry = branchEntries.find(
      (entry) => entry.message.id === resolvedBranchId
    );

    if (matchedEntry) {
      return matchedEntry;
    }

    const safeIndex = Math.max(
      0,
      Math.min(branchEntries.length - 1, fallbackBranchIndex)
    );
    return branchEntries[safeIndex];
  }, [
    branchEntries,
    branchingEnabled,
    fallbackBranchIndex,
    resolvedBranchId,
  ]);

  const effectiveMessage = effectiveBranchEntry?.message ?? message;
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
      <div className="flex items-start gap-2 pb-4">
        {/* Avatar gutter spacer - matches the avatar width + gap */}
        <div aria-hidden="true" className="size-8 shrink-0" />
        <div
          className={cn(
            "flex flex-wrap items-start gap-3 pt-1 min-w-0",
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
    "group flex flex-col gap-0 max-w-[80%]",
    !showAnyActions && !showBranchSelector && "pt-4",
    (showAnyActions || showBranchSelector) && "[&>div]:pb-0"
  );

  const handleBranchChange = useCallback(
    (nextIndex: number) => {
      if (isStreaming) return;
      if (!branchingEnabled) return;
      if (!branching?.selectBranch) return;
      if (!messageId) return;
      if (nextIndex < 0 || nextIndex >= branchEntries.length) return;

      const target = branchEntries[nextIndex];
      const targetId = target?.message.id;
      if (!targetId) return;

      if (
        targetId === resolvedBranchId &&
        (normalizedSelectedBranchIndex ?? defaultBranchIndex) === nextIndex
      ) {
        return;
      }

      branching.selectBranch(messageId, targetId, nextIndex);
    },
    [
      branchEntries,
      branching,
      branchingEnabled,
      defaultBranchIndex,
      isStreaming,
      messageId,
      normalizedSelectedBranchIndex,
      resolvedBranchId,
    ]
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
