import React, { useCallback, useMemo, useRef } from "react";
import type { UIMessage } from "ai";
import { ChatInputWithCommands } from "../../components/chat/chat-input-with-commands";
import {
  ChatMessages,
  type ChatMessagesHandle,
} from "../../components/chat/chat-messages";
import { useSuggestions } from "../../hooks/use-suggestions";
import { useAIMCPServersStore } from "../../stores";
import { cn } from "../../utils";
import { ChatThreadsButton } from "./chat-threads-button";
import { McpServersDialog } from "./mcp-servers-dialog";

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
}> = ({ scopeKey }) => {
  return <ChatThreadsButton scopeKey={scopeKey} className="ml-1" />;
};

type AssistantActionsProp =
  | React.ReactNode
  | ((message: UIMessage) => React.ReactNode);

export interface ChatContainerProps {
  // Required: pass chat hook result
  chat: ChatHook;

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

  // Threads group (optional)
  threads?: {
    enabled?: boolean;
  };

  /**
   * Optional controls rendered beneath assistant responses.
   * Always visible on the latest reply and revealed on hover/focus for previous replies.
   */
  assistantActions?: AssistantActionsProp;

  /**
   * Additional controls shown only for the latest assistant response.
   * Accepts a static node or a function receiving the assistant message.
   */
  assistantLatestActions?: AssistantActionsProp;
}

export function ChatContainer(props: ChatContainerProps) {
  // Ref to control scrolling programmatically
  const messagesRef = useRef<ChatMessagesHandle | null>(null);
  const [isMcpDialogOpen, setIsMcpDialogOpen] = React.useState(false);
  const mcpConfigurations = useAIMCPServersStore(
    (state) => state.configurations
  );
  const addOrUpdateMcpConfiguration = useAIMCPServersStore(
    (state) => state.addOrUpdateConfiguration
  );
  const removeMcpConfiguration = useAIMCPServersStore(
    (state) => state.removeConfiguration
  );
  const mcpServersMap = useAIMCPServersStore((state) => state.servers);

  // Get state from required chat hook
  const messages = props.chat.messages;
  const isLoading = props.chat.isLoading;
  const status = props.chat.status;

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
        props.chat.sendMessageWithContext(text);
      } catch {
        /* ignore */
      }
    },
    [props.chat]
  );

  // AI command execution via chat hook
  const handleAICommandExecute = useCallback(
    (message: string, toolName: string, systemPrompt?: string) => {
      props.chat.sendAICommandMessage(message, toolName, systemPrompt);
    },
    [props.chat]
  );
  // Handle suggestions
  const { suggestions, handleSuggestionClick } = useSuggestions({
    enabled: props.suggestions?.enabled ?? false,
    prompt: props.suggestions?.prompt,
    messages,
    numSuggestions: props.suggestions?.count,
    onSuggestionClick: (suggestion) => {
      props.chat.sendMessageWithContext(suggestion.longSuggestion);
      // Scroll after next frame so message is rendered
      requestAnimationFrame(() => {
        messagesRef.current?.scrollToBottom();
      });
    },
  });

  const mcpEnabled = props.chat?.mcpEnabled ?? false;
  const chainOfThoughtEnabled = props.chat.chainOfThoughtEnabled ?? false;

  const renderAssistantActions = useMemo(
    () => normalizeActionsRenderer(props.assistantActions),
    [props.assistantActions]
  );

  const renderAssistantLatestActions = useMemo(
    () => normalizeActionsRenderer(props.assistantLatestActions),
    [props.assistantLatestActions]
  );

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
        showMcpButton={mcpEnabled}
        onOpenMcpDialog={
          mcpEnabled ? () => setIsMcpDialogOpen(true) : undefined
        }
        actions={
          props.threads?.enabled ||
          (typeof process !== "undefined" &&
            process.env.NODE_ENV !== "production") ||
          props.header?.actions ? (
            <>
              {props.threads?.enabled && (
                <React.Suspense fallback={null}>
                  {/* Lazy import to avoid bundle impact if unused */}
                  <ThreadsDropdownWrapper scopeKey={props.chat.scopeKey} />
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
          ) : undefined
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
        threadId={props.chat.threadId}
        useChainOfThought={chainOfThoughtEnabled}
        renderAssistantActions={renderAssistantActions}
        renderAssistantLatestActions={renderAssistantLatestActions}
        assistantActionsClassName={props.ui?.classes?.assistantActions}
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
          value={props.chat.input}
          onChange={(value: string) => props.chat.setInput(value)}
          placeholder={props.ui?.placeholder}
          disabled={isLoading}
          status={status}
          className={props.ui?.classes?.input}
          models={props.chat.models}
          selectedModelId={props.chat.model}
          onModelChange={props.chat.setModel ? (value) => props.chat.setModel(value) : undefined}
          // Suggestions props
          enableSuggestions={props.suggestions?.enabled}
          suggestions={suggestions}
          suggestionsCount={props.suggestions?.count ?? 3}
          onSuggestionClick={handleSuggestionClick}
          // Commands props
          enableCommands={props.commands?.enabled}
          onCommandExecute={undefined}
          onAICommandExecute={handleAICommandExecute}
        />
      </div>
      {mcpEnabled && (
        <McpServersDialog
          open={isMcpDialogOpen}
          onOpenChange={setIsMcpDialogOpen}
          configs={mcpConfigurations}
          onSave={addOrUpdateMcpConfiguration}
          onRemove={removeMcpConfiguration}
          serversMap={mcpServersMap}
        />
      )}
    </div>
  );
}

function normalizeActionsRenderer(
  input: AssistantActionsProp | undefined
): ((message: UIMessage) => React.ReactNode) | undefined {
  if (!input) return undefined;
  if (typeof input === "function") {
    return input as (message: UIMessage) => React.ReactNode;
  }
  const node = input;
  return () => node;
}
