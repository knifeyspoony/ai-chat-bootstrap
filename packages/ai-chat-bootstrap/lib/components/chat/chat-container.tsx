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
  useAIChat,
  type ThreadsOptions,
  type UseAIChatOptions,
} from "../../hooks/use-ai-chat";
import { useSuggestions } from "../../hooks/use-suggestions";
import { useChatStore } from "../../stores/chat";
import type { AssistantAction } from "../../types/actions";
import type { Suggestion } from "../../types/chat";
import { cn } from "../../utils";
import { buildBuiltInActions } from "../../utils/built-in-actions";
import { ChatThreadsButton } from "./chat-threads-button";
import { McpServersButton } from "./mcp-servers-button";

import { ChatHeader } from "./chat-header";
import { SheetPortalProvider } from "../ui/sheet-context";

// Lazily load the debug button (development only) so it is tree-shaken away in production
const LazyChatDebugButton = React.lazy(async () =>
  import("./chat-debug-button").then((m) => ({ default: m.ChatDebugButton }))
);

// Lightweight wrapper to lazy load the threads dropdown only when needed
const ThreadsDropdownWrapper: React.FC<{
  scopeKey?: string;
}> = ({ scopeKey }) => {
  return <ChatThreadsButton scopeKey={scopeKey} className="ml-1" />;
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
    };
    emptyState?: React.ReactNode;
  };

  // Suggestions group
  suggestions?: {
    enabled?: boolean;
    prompt?: string;
    count?: number;
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

  /** Development tooling configuration */
  devtools?: {
    /** Show the header debug button (development only, defaults to false) */
    headerDebugButton?: boolean;
  };
}

type ChatContainerUiProps = Omit<ChatContainerProps, keyof UseAIChatOptions>;

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
    suggestions: suggestionOptions,
    commands: commandOptions,
    threads: threadsOptions,
    assistantActions: assistantActionOptions,
    ["data-acb-unstyled"]: unstyledProp,
    devtools,
  } = props;

  const {
    messages,
    isLoading,
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
      } catch {
        /* ignore */
      }
    },
    [sendMessageWithContext]
  );

  // AI command execution via chat hook
  const handleAICommandExecute = useCallback(
    (message: string, toolName: string, systemPrompt?: string) => {
      sendAICommandMessage(message, toolName, systemPrompt);
    },
    [sendAICommandMessage]
  );

  // Stable suggestion click handler
  const handleSuggestionClick = useCallback(
    (suggestion: Suggestion) => {
      sendMessageWithContext(suggestion.longSuggestion);
      // Scroll after next frame so message is rendered
      requestAnimationFrame(() => {
        messagesRef.current?.scrollToBottom();
      });
    },
    [sendMessageWithContext]
  );

  // Handle suggestions
  const {
    suggestions: generatedSuggestions,
    handleSuggestionClick: suggestionClickHandler,
  } = useSuggestions({
    enabled: suggestionOptions?.enabled ?? false,
    prompt: suggestionOptions?.prompt,
    messages: deferredMessages, // Use deferred messages for suggestions
    numSuggestions: suggestionOptions?.count,
    onSuggestionClick: handleSuggestionClick,
  });

  // Defer suggestions to avoid blocking input
  const deferredSuggestions = useDeferredValue(generatedSuggestions);

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

  // Memoize header actions to prevent recreating on every render
  const headerActions = useMemo(() => {
    const hasThreads = threadsOptions?.enabled;
    const isProduction =
      typeof process !== "undefined" && process.env.NODE_ENV === "production";
    const debugButtonEnabled = devtools?.headerDebugButton ?? false;
    const hasDebug = !isProduction && debugButtonEnabled;
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
        {/* Debug tools are only rendered in non-production */}
        {hasDebug && (
          <React.Suspense fallback={null}>
            {/* Dynamic import to avoid including debug UI in prod bundles */}
            <LazyChatDebugButton />
          </React.Suspense>
        )}
        {hasCustomActions && header?.actions}
      </>
    );
  }, [
    threadsOptions?.enabled,
    scopeKey,
    mcpEnabled,
    header?.actions,
    devtools?.headerDebugButton,
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
        className={cn(
          !isUnstyled &&
            "relative flex flex-col h-full overflow-hidden min-w-0 rounded-md border bg-[var(--acb-chat-container-bg)] border-[var(--acb-chat-container-border)]",
          isUnstyled && "relative flex flex-col h-full overflow-hidden min-w-0",
          ui?.className
        )}
        style={{
          borderRadius: isUnstyled
            ? undefined
            : "var(--acb-chat-container-radius)",
        }}
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

        <ChatMessages
          ref={messagesRef}
          messages={deferredMessages}
          isLoading={deferredIsLoading}
          className={ui?.classes?.messages}
          messageClassName={ui?.classes?.message}
          emptyState={ui?.emptyState}
          threadId={threadId}
          useChainOfThought={chainOfThoughtEnabled}
          assistantActionsClassName={ui?.classes?.assistantActions}
          assistantActionsConfig={assistantActionsConfig}
          compression={compression}
          branching={branching}
        />

        <div
          data-acb-part="input-wrapper"
          className={cn(
            !isUnstyled &&
              "backdrop-blur-sm p-4 rounded-b-md bg-[var(--acb-chat-input-wrapper-bg)]",
            isUnstyled && "p-0"
          )}
        >
          <ChatInputWithCommands
            onSubmit={onSubmit}
            value={input}
            onChange={setInput}
            placeholder={ui?.placeholder}
            // Keep input enabled during streaming - users can type their next message
            disabled={false}
            // Submit is disabled when actually loading (not just streaming)
            submitDisabled={isLoading}
            status={status}
            className={ui?.classes?.input}
            models={models}
            selectedModelId={model}
            onModelChange={setModel}
            // Suggestions props
            enableSuggestions={suggestionOptions?.enabled}
            suggestions={deferredSuggestions}
            suggestionsCount={suggestionOptions?.count ?? 3}
            onSuggestionClick={suggestionClickHandler}
            // Commands props
            enableCommands={commandOptions?.enabled}
            onCommandExecute={undefined}
            onAICommandExecute={handleAICommandExecute}
            // Performance props - pass deferred store subscriptions to avoid child re-renders
            allFocusItems={deferredAllFocusItems}
            clearFocus={clearFocus}
            error={error}
            setError={setError}
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
  });

  return <ChatContainerView {...uiProps} threads={threadsOptions} chat={chat} />;
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
      if (prevMcpServers[i].id !== nextMcpServers[i].id) return false;
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
