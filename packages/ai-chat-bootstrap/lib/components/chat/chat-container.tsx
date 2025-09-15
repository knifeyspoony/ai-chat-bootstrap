import type { ChatStatus, UIMessage } from "ai";
import React, { useCallback, useRef } from "react";
import { ChatInputWithCommands } from "../../components/chat/chat-input-with-commands";
import {
  ChatMessages,
  type ChatMessagesHandle,
} from "../../components/chat/chat-messages";
import { useSuggestions } from "../../hooks/use-suggestions";
import { cn } from "../../utils";
import { ChatThreadsButton } from "./chat-threads-button";

// type-only import to avoid cycles
import type { useAIChat } from "../../hooks";
import { ChatHeader } from "./chat-header";
type ChatHook = ReturnType<typeof useAIChat>;

// Lazily load the debug button (development only) so it is tree-shaken away in production
const LazyChatDebugButton = React.lazy(async () =>
  import("./chat-debug-button").then((m) => ({ default: m.ChatDebugButton }))
);

// Lightweight wrapper to lazy load the threads dropdown only when needed
const ThreadsDropdownWrapper: React.FC<{
  scopeKey?: string;
  onSelectThread?: (id: string) => void;
  onCreateThread?: (id: string) => void;
}> = ({ scopeKey, onSelectThread, onCreateThread }) => {
  return (
    <ChatThreadsButton
      scopeKey={scopeKey}
      onSelectThread={onSelectThread}
      onCreateThread={onCreateThread ?? onSelectThread}
      className="ml-1"
    />
  );
};

export interface ChatContainerProps {
  // Preferred: pass chat hook result
  chat?: ChatHook;

  // Grouped input config
  inputProps?: {
    value?: string;
    onChange?: (value: string) => void;
    onSubmit?: (e: React.FormEvent) => void;
    onAttach?: () => void;
  };

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
    };
    emptyState?: React.ReactNode;
  };

  // Suggestions group
  suggestions?: {
    enabled?: boolean;
    prompt?: string;
    count?: number;
    api?: string; // endpoint for suggestions fetching
    onAssistantFinish?: (triggerFetch: () => void) => void;
    onSendMessage?: (message: string) => void;
  };

  // Commands group
  commands?: {
    enabled?: boolean;
    onExecute?: (commandName: string, args?: string) => void;
    onAICommandExecute?: (
      message: string,
      toolName: string,
      systemPrompt?: string
    ) => void;
  };

  // Threads group (optional)
  threads?: {
    enabled?: boolean;
    scopeKey?: string;
    threadId?: string; // externally controlled active thread id
    onThreadChange?: (threadId: string) => void;
  };

  // Explicit state overrides if not using chat
  state?: {
    messages?: UIMessage[];
    isLoading?: boolean;
    status?: ChatStatus;
  };
}

export function ChatContainer(props: ChatContainerProps) {
  // Ref to control scrolling programmatically
  const messagesRef = useRef<ChatMessagesHandle | null>(null);
  const onAttach = props.inputProps?.onAttach;
  const controlledValue = props.inputProps?.value;
  const controlledOnChange = props.inputProps?.onChange;

  // Resolve state from chat -> state -> legacy
  const messages = props.chat?.messages ?? props.state?.messages ?? [];
  const isLoading = props.chat?.isLoading ?? props.state?.isLoading ?? false;
  const status = props.chat?.status ?? props.state?.status;

  // Note: We do not sync messages to threads here to avoid render loops.
  // The useAIChat hook manages persistence into the threads store.

  const providedOnSubmit = props.inputProps?.onSubmit;
  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (providedOnSubmit) return providedOnSubmit(e);
      // Default behavior: extract from form and send via chat hook
      const form = e.target as HTMLFormElement;
      try {
        const fd = new FormData(form);
        const text = String(fd.get("message") || "").trim();
        if (!text) return;
        props.chat?.sendMessageWithContext(text);
      } catch {
        /* ignore */
      }
    },
    [providedOnSubmit, props.chat]
  );

  // Default AI command execution: prefer chat hook, else delegate to consumer handler.
  const handleAICommandExecute = useCallback(
    (message: string, toolName: string, systemPrompt?: string) => {
      if (props.chat) {
        props.chat.sendAICommandMessage(message, toolName, systemPrompt);
      } else {
        props.commands?.onAICommandExecute?.(message, toolName, systemPrompt);
      }
    },
    [props.chat, props.commands?.onAICommandExecute]
  );
  // Handle suggestions
  const {
    suggestions,
    handleSuggestionClick,
    onAssistantFinish: triggerSuggestionsFetch,
  } = useSuggestions({
    enabled: props.suggestions?.enabled ?? false,
    prompt: props.suggestions?.prompt,
    messages,
    numSuggestions: props.suggestions?.count,
    api: props.suggestions?.api,
    onSuggestionClick: (suggestion) => {
      const send = props.suggestions?.onSendMessage;
      if (send) {
        send(suggestion.longSuggestion);
        // Scroll after next frame so message is rendered
        requestAnimationFrame(() => {
          messagesRef.current?.scrollToBottom();
        });
      }
    },
  });

  // Register suggestions fetch function with parent
  React.useEffect(() => {
    const cb = props.suggestions?.onAssistantFinish;
    const enabled = props.suggestions?.enabled;
    if (cb && enabled) {
      cb(triggerSuggestionsFetch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.suggestions?.onAssistantFinish, props.suggestions?.enabled]); // Remove triggerSuggestionsFetch to prevent re-registration

  // Unstyled mode: if any ancestor or this component has data-acb-unstyled, suppress base chrome classes
  const isUnstyled =
    (props as any)["data-acb-unstyled"] === "" ||
    (props as any)["data-acb-unstyled"] === true;
  return (
    <div
      data-acb-part="container"
      className={cn(
        !isUnstyled &&
          "flex flex-col h-full overflow-hidden min-w-0 rounded-md border bg-[var(--acb-chat-container-bg)] border-[var(--acb-chat-container-border)]",
        isUnstyled && "flex flex-col h-full overflow-hidden min-w-0",
        props.ui?.className
      )}
      style={{
        borderRadius: isUnstyled
          ? undefined
          : "var(--acb-chat-container-radius)",
      }}
      data-acb-unstyled={isUnstyled ? "" : undefined}
    >
      <ChatHeader
        title={props.header?.title}
        subtitle={props.header?.subtitle}
        avatar={props.header?.avatar}
        badge={props.header?.badge}
        actions={
          <>
            {props.threads?.enabled && (
              <React.Suspense fallback={null}>
                {/* Lazy import to avoid bundle impact if unused */}
                <ThreadsDropdownWrapper
                  scopeKey={props.threads?.scopeKey}
                  onSelectThread={props.threads?.onThreadChange}
                />
              </React.Suspense>
            )}
            {/* Debug tools are only rendered in non-production */}
            {typeof process !== "undefined" &&
              process.env.NODE_ENV !== "production" && (
                <React.Suspense fallback={null}>
                  {/* Dynamic import to avoid including debug UI in prod bundles */}
                  <LazyChatDebugButton />
                </React.Suspense>
              )}
            {props.header?.actions}
          </>
        }
        className={props.header?.className ?? props.ui?.classes?.header}
      />

      <ChatMessages
        ref={messagesRef}
        messages={messages}
        isLoading={isLoading}
        className={props.ui?.classes?.messages}
        messageClassName={props.ui?.classes?.message}
        emptyState={props.ui?.emptyState}
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
          onAttach={onAttach}
          value={controlledValue as any}
          onChange={controlledOnChange as any}
          placeholder={props.ui?.placeholder}
          disabled={isLoading}
          status={status}
          className={props.ui?.classes?.input}
          // Suggestions props
          enableSuggestions={props.suggestions?.enabled}
          suggestions={suggestions}
          suggestionsCount={props.suggestions?.count ?? 3}
          onSuggestionClick={handleSuggestionClick}
          // Commands props
          enableCommands={props.commands?.enabled}
          onCommandExecute={props.commands?.onExecute}
          onAICommandExecute={handleAICommandExecute}
        />
      </div>
    </div>
  );
}
