import type { UIMessage } from "ai";
import React, {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { ChatInputWithCommands } from "../../components/chat/chat-input-with-commands";
import {
  ChatMessages,
  type ChatMessagesHandle,
} from "../../components/chat/chat-messages";
import { useAIFocus } from "../../hooks";
import {
  DevToolsConfig,
  useAIChat,
  type ThreadsOptions,
  type UseAIChatOptions,
} from "../../hooks/use-ai-chat";
import { useChatStore } from "../../stores/chat";
import type { AssistantAction } from "../../types/actions";
import type { Suggestion } from "../../types/chat";
import { cn } from "../../utils";
import { buildBuiltInActions } from "../../utils/built-in-actions";
import { logDevError } from "../../utils/dev-logger";
import { ChatThreadsButton } from "./chat-threads-button";
import { McpServersButton } from "./mcp-servers-button";

import { Loader } from "../ai-elements/loader";
import type { ResponseProps } from "../ai-elements/response";
import { SheetPortalProvider } from "../ui/sheet-context";
import { ChatDebugButton } from "./chat-debug-button";
import { ChatHeader } from "./chat-header";

// Lightweight wrapper to lazy load the threads dropdown only when needed
const ThreadsDropdownWrapper: React.FC<{
  scopeKey?: string;
}> = ({ scopeKey }) => {
  return <ChatThreadsButton scopeKey={scopeKey} />;
};

export type ChatContainerDevToolsConfig = DevToolsConfig & {
  /**
   * Show debug button in header.
   * Defaults to the value of `enabled`.
   */
  headerDebugButton?: boolean;
};

export interface ChatContainerProps extends UseAIChatOptions {
  "data-acb-unstyled"?: "" | boolean;

  /** Convenience toggle for assistant branching. Mirrors `features.branching`. */
  enableBranching?: boolean;

  // ==========================================
  // UI CONFIGURATION
  // ==========================================

  // Header group
  header?: {
    title?: string;
    subtitle?: string;
    avatar?: React.ReactNode;
    badge?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
  };

  // UI group
  ui?: {
    placeholder?: string;
    className?: string;
    classes?: {
      header?: string;
      messages?: string;
      message?: string;
      input?: string;
      assistantActions?: string;
      inputWrapper?: string;
    };
    response?: ResponseProps;
    emptyState?: React.ReactNode;
    style?: React.CSSProperties;
    assistantAvatar?: string | React.ReactNode;
    userAvatar?: string | React.ReactNode;
    showTimestamps?: boolean;
  };

  // Commands group
  commands?: {
    enabled?: boolean;
  };

  /**
   * Assistant actions configuration with built-in and custom actions.
   * Built-in actions can be enabled with simple boolean flags or configuration objects.
   * Custom actions allow full flexibility for user-defined behaviors.
   */
  assistantActions?: {
    /** Enable copy action to copy message text to clipboard */
    copy?: boolean;
    /** Enable regenerate action to retry the last assistant response */
    regenerate?: boolean;
    /** Enable debug action to view message details */
    debug?: boolean;
    /** Enable feedback actions with callbacks for user feedback */
    feedback?: {
      onThumbsUp: (message: UIMessage) => void | Promise<void>;
      onThumbsDown: (message: UIMessage) => void | Promise<void>;
    };
    /** Custom actions with full control over behavior and appearance */
    custom?: AssistantAction[];
  };

  devTools?: ChatContainerDevToolsConfig;
}

// Omit all the useAIChat options that are already defined in ChatContainerProps, except include our extended version of devTools
type ChatContainerUiProps = Omit<ChatContainerProps, keyof UseAIChatOptions> & {
  devTools?: ChatContainerDevToolsConfig;
};

type ChatAdapter = ReturnType<typeof useAIChat>;

interface ChatContainerViewProps extends ChatContainerUiProps {
  chat: ChatAdapter;
  threads?: ThreadsOptions;
}

function ChatContainerView(props: ChatContainerViewProps) {
  const {
    chat,
    header,
    ui,
    commands: commandOptions,
    threads: threadsOptions,
    assistantActions: assistantActionOptions,
    ["data-acb-unstyled"]: unstyledProp,
    devTools,
  } = props;

  const {
    messages,
    isLoading,
    isRestoringThread,
    status,
    input,
    setInput,
    model,
    setModel,
    models,
    threadId,
    scopeKey,
    chainOfThoughtEnabled,
    branching,
    mcpEnabled,
    sendMessageWithContext,
    sendAICommandMessage,
    regenerate,
    compression,
    clearError: clearChatError,
    suggestions: suggestionsState,
    stop,
  } = chat;

  // Ref to control scrolling programmatically
  const messagesRef = useRef<ChatMessagesHandle | null>(null);
  const [sheetContainer, setSheetContainer] = useState<HTMLDivElement | null>(
    null
  );
  const chatContainerRef = useCallback((node: HTMLDivElement | null) => {
    setSheetContainer((prev) => (prev === node ? prev : node));
  }, []);

  // Defer non-critical updates to prevent input lag
  const deferredMessages = useDeferredValue(messages);
  const deferredIsLoading = useDeferredValue(isLoading);
  const deferredIsRestoringThread = useDeferredValue(isRestoringThread);
  const messagesLoading = deferredIsLoading || deferredIsRestoringThread;

  // Compute devTools flags
  const devToolsEnabled = devTools?.enabled ?? false;
  const showErrorMessages = devTools?.showErrorMessages ?? devToolsEnabled;

  // Note: We do not sync messages to threads here to avoid render loops.
  // The useAIChat hook manages persistence into the threads store.

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      // Extract message from form and send via chat hook
      const form = e.target as HTMLFormElement;
      try {
        const fd = new FormData(form);
        const text = String(fd.get("message") || "").trim();
        if (!text) return;
        sendMessageWithContext(text);
      } catch (error) {
        logDevError(
          "[acb][ChatContainer] failed to submit message with context",
          error,
          showErrorMessages
        );
      }
    },
    [sendMessageWithContext, showErrorMessages]
  );

  // AI command execution via chat hook
  const handleAICommandExecute = useCallback(
    (message: string, toolName: string, systemPrompt?: string) => {
      sendAICommandMessage(message, toolName, systemPrompt);
    },
    [sendAICommandMessage]
  );

  // Stable suggestion click handler
  const baseSuggestionClick = suggestionsState?.handleSuggestionClick;
  const suggestionItems = suggestionsState?.items ?? [];
  const suggestionsEnabled = suggestionsState?.enabled ?? false;
  const suggestionCount = suggestionsState?.count ?? 3;

  const handleSuggestionClick = useCallback(
    (suggestion: Suggestion) => {
      baseSuggestionClick?.(suggestion);
      // Scroll after next frame so message is rendered
      requestAnimationFrame(() => {
        messagesRef.current?.scrollToBottom();
      });
    },
    [baseSuggestionClick]
  );

  // Defer suggestions to avoid blocking input
  const deferredSuggestions = useDeferredValue(suggestionItems);

  // Optimized store subscriptions - useAIFocus already uses useShallow internally
  const { allFocusItems, clearFocus } = useAIFocus();

  // Defer focus items to avoid blocking input during focus changes
  const deferredAllFocusItems = useDeferredValue(allFocusItems);

  // Chat store subscriptions with stable selectors using useShallow
  const { error, setError } = useChatStore(
    useShallow((state) => ({
      error: state.error,
      setError: state.setError,
    }))
  );

  const handleSetError = useCallback(
    (value: string | null) => {
      if (value) {
        setError(value);
        return;
      }
      clearChatError();
    },
    [clearChatError, setError]
  );

  // Memoize header actions to prevent recreating on every render
  const headerActions = useMemo(() => {
    const hasThreads = threadsOptions?.enabled;
    // Use devTools.enabled as master switch, with headerDebugButton as override
    const devToolsEnabled = devTools?.enabled ?? false;
    const debugButtonEnabled = devTools?.headerDebugButton ?? devToolsEnabled;
    const hasDebug = debugButtonEnabled;
    const hasMcp = mcpEnabled;
    const hasCustomActions = header?.actions;

    if (!hasThreads && !hasDebug && !hasMcp && !hasCustomActions) {
      return undefined;
    }

    return (
      <>
        {hasMcp && <McpServersButton />}
        {hasThreads && (
          <React.Suspense fallback={null}>
            {/* Lazy import to avoid bundle impact if unused */}
            <ThreadsDropdownWrapper scopeKey={scopeKey} />
          </React.Suspense>
        )}
        {/* Debug button controlled by devTools config - always bundled */}
        {hasDebug && <ChatDebugButton />}
        {hasCustomActions && header?.actions}
      </>
    );
  }, [
    threadsOptions?.enabled,
    scopeKey,
    mcpEnabled,
    header?.actions,
    devTools?.enabled,
    devTools?.headerDebugButton,
  ]);

  // Build assistant actions configuration from built-in and custom actions
  const assistantActionsConfig = useMemo(() => {
    if (!assistantActionOptions) return undefined;

    const builtInActions = buildBuiltInActions(
      {
        copy: assistantActionOptions.copy,
        regenerate: assistantActionOptions.regenerate,
        debug: assistantActionOptions.debug,
        feedback: assistantActionOptions.feedback,
      },
      {
        regenerate,
        isLoading,
      }
    );

    const customActions = assistantActionOptions.custom || [];

    // Combine built-in and custom actions
    return [...builtInActions, ...customActions];
  }, [assistantActionOptions, regenerate, isLoading]);

  // Unstyled mode: if any ancestor or this component has data-acb-unstyled, suppress base chrome classes
  const isUnstyled = unstyledProp === "" || unstyledProp === true;
  return (
    <SheetPortalProvider container={sheetContainer}>
      <div
        ref={chatContainerRef}
        data-acb-part="container"
        aria-busy={isRestoringThread || undefined}
        className={cn(
          !isUnstyled &&
            "relative flex flex-col h-full overflow-hidden min-w-0 rounded-md border bg-[var(--acb-chat-container-bg)] border-[var(--acb-chat-container-border)]",
          isUnstyled && "relative flex flex-col h-full overflow-hidden min-w-0",
          ui?.className
        )}
        style={
          {
            ...(isUnstyled
              ? {}
              : { borderRadius: "var(--acb-chat-container-radius)" }),
            ...(ui?.style ?? {}),
          } as React.CSSProperties
        }
        data-acb-unstyled={isUnstyled ? "" : undefined}
      >
        <ChatHeader
          title={header?.title}
          subtitle={header?.subtitle}
          avatar={header?.avatar}
          badge={header?.badge}
          actions={headerActions}
          className={header?.className ?? ui?.classes?.header}
        />

        <div className="relative flex flex-col flex-1 min-h-0">
          <ChatMessages
            ref={messagesRef}
            messages={deferredMessages}
            showTimestamps={ui?.showTimestamps}
            isLoading={messagesLoading}
            className={ui?.classes?.messages}
            messageClassName={ui?.classes?.message}
            emptyState={ui?.emptyState}
            threadId={threadId}
            useChainOfThought={chainOfThoughtEnabled}
            assistantActionsClassName={ui?.classes?.assistantActions}
            assistantActionsConfig={assistantActionsConfig}
            compression={compression}
            branching={branching}
            responseProps={ui?.response}
            assistantAvatar={ui?.assistantAvatar}
            userAvatar={ui?.userAvatar}
          />
          {isRestoringThread && (
            <div
              data-acb-part="thread-loading-overlay"
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm"
              role="status"
              aria-live="polite"
              style={{
                backgroundColor:
                  "var(--acb-chat-thread-overlay-bg, rgba(9, 9, 11, 0.55))",
                color:
                  "var(--acb-chat-thread-overlay-fg, rgba(255, 255, 255, 0.95))",
              }}
            >
              <Loader />
              <span>Loading conversation…</span>
            </div>
          )}
        </div>

        <div
          data-acb-part="input-wrapper"
          className={cn(
            !isUnstyled &&
              "p-4 rounded-b-md bg-[var(--acb-chat-input-wrapper-bg)]",
            isUnstyled && "p-0",
            ui?.classes?.inputWrapper
          )}
        >
          <ChatInputWithCommands
            onSubmit={onSubmit}
            value={input}
            onChange={setInput}
            placeholder={ui?.placeholder}
            // Keep input enabled during streaming, but lock while restoring a persisted thread
            disabled={isRestoringThread}
            // Submit is disabled while performing network work or restoring a thread snapshot
            submitDisabled={isLoading || isRestoringThread}
            status={status}
            onStop={stop}
            className={ui?.classes?.input}
            models={models}
            selectedModelId={model}
            onModelChange={setModel}
            // Suggestions props
            enableSuggestions={suggestionsEnabled}
            suggestions={deferredSuggestions}
            suggestionsCount={suggestionCount}
            onSuggestionClick={handleSuggestionClick}
            // Commands props
            enableCommands={commandOptions?.enabled}
            onCommandExecute={undefined}
            onAICommandExecute={handleAICommandExecute}
            // Performance props - pass deferred store subscriptions to avoid child re-renders
            allFocusItems={deferredAllFocusItems}
            clearFocus={clearFocus}
            error={error}
            setError={handleSetError}
            compression={compression}
          />
        </div>
      </div>
    </SheetPortalProvider>
  );
}

function ChatContainerImpl(props: ChatContainerProps) {
  const {
    transport,
    messages: messagesOptions,
    threads: threadsOptions,
    features,
    enableBranching,
    mcp,
    models: modelsOptions,
    compression: compressionOptions,
    suggestions: suggestionsOptions,
    devTools,
    ...uiProps
  } = props;

  const mergedFeatures = useMemo(() => {
    if (enableBranching === undefined) {
      return features;
    }
    return {
      ...features,
      branching: enableBranching,
    } as ChatContainerProps["features"];
  }, [features, enableBranching]);

  const chat = useAIChat({
    transport,
    messages: messagesOptions,
    threads: threadsOptions,
    features: mergedFeatures,
    mcp,
    models: modelsOptions,
    compression: compressionOptions,
    suggestions: suggestionsOptions,
    devTools,
  });

  return (
    <ChatContainerView
      {...uiProps}
      threads={threadsOptions}
      chat={chat}
      devTools={devTools}
    />
  );
}

// Optimized with React.memo to prevent re-renders during streaming
export const ChatContainer = React.memo(ChatContainerImpl, (prev, next) => {
  if (prev.transport?.api !== next.transport?.api) return false;

  if (prev.messages?.systemPrompt !== next.messages?.systemPrompt) return false;

  const prevInitialMessages = prev.messages?.initial;
  const nextInitialMessages = next.messages?.initial;
  if ((prevInitialMessages?.length ?? 0) !== (nextInitialMessages?.length ?? 0))
    return false;
  if (prevInitialMessages && nextInitialMessages) {
    for (let i = 0; i < prevInitialMessages.length; i++) {
      if (prevInitialMessages[i].id !== nextInitialMessages[i].id) return false;
    }
  }

  const prevThreads = prev.threads;
  const nextThreads = next.threads;
  if ((prevThreads?.enabled ?? false) !== (nextThreads?.enabled ?? false))
    return false;
  if ((prevThreads?.id ?? "") !== (nextThreads?.id ?? "")) return false;
  if ((prevThreads?.scopeKey ?? "") !== (nextThreads?.scopeKey ?? ""))
    return false;
  if ((prevThreads?.autoCreate ?? true) !== (nextThreads?.autoCreate ?? true))
    return false;
  if (
    (prevThreads?.warnOnMissing ?? false) !==
    (nextThreads?.warnOnMissing ?? false)
  )
    return false;

  const prevTitle = prevThreads?.title;
  const nextTitle = nextThreads?.title;
  if ((prevTitle?.enabled ?? false) !== (nextTitle?.enabled ?? false))
    return false;
  if ((prevTitle?.api ?? "") !== (nextTitle?.api ?? "")) return false;
  if ((prevTitle?.sampleCount ?? 0) !== (nextTitle?.sampleCount ?? 0))
    return false;

  if ((prev.enableBranching ?? false) !== (next.enableBranching ?? false))
    return false;

  if (prev.features?.chainOfThought !== next.features?.chainOfThought)
    return false;
  if (prev.features?.branching !== next.features?.branching) return false;

  if (prev.mcp?.enabled !== next.mcp?.enabled) return false;
  if (prev.mcp?.api !== next.mcp?.api) return false;

  const prevMcpServers = prev.mcp?.servers;
  const nextMcpServers = next.mcp?.servers;
  if ((prevMcpServers?.length ?? 0) !== (nextMcpServers?.length ?? 0))
    return false;
  if (prevMcpServers && nextMcpServers) {
    for (let i = 0; i < prevMcpServers.length; i++) {
      const prevServer = prevMcpServers[i];
      const nextServer = nextMcpServers[i];
      if (prevServer.id !== nextServer.id) return false;
      if ((prevServer.name ?? "") !== (nextServer.name ?? "")) return false;
      if (prevServer.transport.type !== nextServer.transport.type) return false;
      if (prevServer.transport.url !== nextServer.transport.url) return false;

      const prevHeaders = prevServer.transport.headers;
      const nextHeaders = nextServer.transport.headers;

      const prevHeaderKeys = prevHeaders ? Object.keys(prevHeaders).sort() : [];
      const nextHeaderKeys = nextHeaders ? Object.keys(nextHeaders).sort() : [];

      if (prevHeaderKeys.length !== nextHeaderKeys.length) return false;

      for (let j = 0; j < prevHeaderKeys.length; j++) {
        const key = prevHeaderKeys[j];
        const nextKey = nextHeaderKeys[j];
        if (key !== nextKey) return false;
        const prevValue = prevHeaders ? prevHeaders[key] : undefined;
        const nextValue = nextHeaders ? nextHeaders[key] : undefined;
        if (prevValue !== nextValue) return false;
      }
    }
  }

  const prevModelOptions = prev.models?.available;
  const nextModelOptions = next.models?.available;
  if ((prevModelOptions?.length ?? 0) !== (nextModelOptions?.length ?? 0))
    return false;
  if (prevModelOptions && nextModelOptions) {
    for (let i = 0; i < prevModelOptions.length; i++) {
      if (prevModelOptions[i].id !== nextModelOptions[i].id) return false;
    }
  }

  if (prev.models?.initial !== next.models?.initial) return false;

  if (prev.ui?.placeholder !== next.ui?.placeholder) return false;
  if (prev.ui?.className !== next.ui?.className) return false;
  if (prev.ui?.response !== next.ui?.response) return false;
  if (prev.header?.title !== next.header?.title) return false;
  if (prev.header?.subtitle !== next.header?.subtitle) return false;

  return true;
});

export interface MockChatContainerProps extends ChatContainerUiProps {
  chat: ChatAdapter;
}

export const MockChatContainer = React.memo(function MockChatContainer(
  props: MockChatContainerProps
) {
  const { chat, ...uiProps } = props;
  return <ChatContainerView {...uiProps} chat={chat} />;
});
