import type { ChatStatus, UIMessage } from "ai";
import React, { useCallback, useRef, useState } from "react";
import { ChatHeader } from "../../components/chat/chat-header";
import { ChatInputWithCommands } from "../../components/chat/chat-input-with-commands";
import {
  ChatMessages,
  type ChatMessagesHandle,
} from "../../components/chat/chat-messages";
import { useSuggestions } from "../../hooks/use-suggestions";
import { cn } from "../../utils";

// type-only import to avoid cycles
import type { useAIChat } from "../../hooks";
type ChatHook = ReturnType<typeof useAIChat>;

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
    status?: React.ReactNode;
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
  // Internal input state for uncontrolled mode
  const [internalInput, setInternalInput] = useState("");
  const inputValue = props.inputProps?.value ?? internalInput;
  const onChange = props.inputProps?.onChange ?? setInternalInput;
  const onAttach = props.inputProps?.onAttach;

  // Resolve state from chat -> state -> legacy
  const messages = props.chat?.messages ?? props.state?.messages ?? [];
  const isLoading = props.chat?.isLoading ?? props.state?.isLoading ?? false;
  const status = props.chat?.status ?? props.state?.status;

  const providedOnSubmit = props.inputProps?.onSubmit;
  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (providedOnSubmit) return providedOnSubmit(e);
      const text = (inputValue ?? "").toString();
      if (!text.trim()) return;
      if (props.chat) {
        props.chat.sendMessageWithContext(text);
        setInternalInput("");
      }
    },
    [providedOnSubmit, props.chat, inputValue]
  );

  // Default AI command execution: prefer chat hook, else delegate to consumer handler.
  const handleAICommandExecute = useCallback(
    (message: string, toolName: string, systemPrompt?: string) => {
      if (props.chat) {
        props.chat.sendAICommandMessage(message, toolName, systemPrompt);
        onChange("");
      } else {
        props.commands?.onAICommandExecute?.(message, toolName, systemPrompt);
        onChange("");
      }
    },
    [props.chat, props.commands?.onAICommandExecute, onChange]
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

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background overflow-hidden min-w-0",
        props.ui?.className
      )}
    >
      <ChatHeader
        title={props.header?.title}
        subtitle={props.header?.subtitle}
        avatar={props.header?.avatar}
        status={props.header?.status}
        badge={props.header?.badge}
        actions={props.header?.actions}
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

      <div className="bg-background/50 backdrop-blur-sm p-4">
        <ChatInputWithCommands
          value={inputValue}
          onChange={onChange}
          onSubmit={onSubmit}
          onAttach={onAttach}
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
