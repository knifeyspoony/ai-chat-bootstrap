import React from "react"
import { cn } from "../../utils"
import type { UIMessage, ChatStatus } from "ai"
import { ChatHeader } from "../../components/chat/chat-header"
import { ChatMessages } from "../../components/chat/chat-messages"
import { ChatInputWithCommands } from "../../components/chat/chat-input-with-commands"
import { useSuggestions } from "../../hooks/use-suggestions"

export interface ChatContainerProps {
  messages: UIMessage[]
  input: string
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onAttach?: () => void
  isLoading?: boolean
  status?: ChatStatus
  placeholder?: string
  className?: string
  
  // Header props
  title?: string
  subtitle?: string
  avatar?: string
  headerStatus?: "online" | "offline" | "away" | "busy"
  badge?: string
  headerActions?: React.ReactNode
  
  // Component class overrides
  headerClassName?: string
  messagesClassName?: string
  messageClassName?: string
  inputClassName?: string
  
  // Messages props
  emptyState?: React.ReactNode
  
  // Suggestions props  
  enableSuggestions?: boolean
  suggestionsPrompt?: string
  suggestionsCount?: number
  onAssistantFinish?: (triggerFetch: () => void) => void
  onSendMessage?: (message: string) => void
  
  // Commands props
  enableCommands?: boolean
  onCommandExecute?: (commandName: string, args?: string) => void
  onAICommandExecute?: (message: string, toolName: string, systemPrompt?: string) => void
}

export function ChatContainer({
  messages,
  input,
  onInputChange,
  onSubmit,
  onAttach,
  isLoading = false,
  status,
  placeholder,
  className,
  
  // Header props
  title,
  subtitle,
  avatar,
  headerStatus,
  badge,
  headerActions,
  
  // Component class overrides
  headerClassName,
  messagesClassName,
  messageClassName,
  inputClassName,
  
  // Messages props
  emptyState,
  
  // Suggestions props
  enableSuggestions = false,
  suggestionsPrompt,
  suggestionsCount = 3,
  onAssistantFinish,
  onSendMessage,
  
  // Commands props
  enableCommands = false,
  onCommandExecute,
  onAICommandExecute
}: ChatContainerProps) {
  // Handle suggestions
  const { suggestions, handleSuggestionClick, onAssistantFinish: triggerSuggestionsFetch } = useSuggestions({
    enabled: enableSuggestions,
    prompt: suggestionsPrompt,
    messages,
    onSuggestionClick: (suggestion) => {
      // Directly send the long suggestion as a message
      if (onSendMessage) {
        onSendMessage(suggestion.longSuggestion)
      }
    }
  })

  // Register suggestions fetch function with parent
  React.useEffect(() => {
    if (onAssistantFinish && enableSuggestions) {
      onAssistantFinish(triggerSuggestionsFetch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onAssistantFinish, enableSuggestions]) // Remove triggerSuggestionsFetch to prevent re-registration

  return (
    <div className={cn("flex flex-col h-full bg-background overflow-hidden min-w-0", className)}>
      <ChatHeader
        title={title}
        subtitle={subtitle}
        avatar={avatar}
        status={headerStatus}
        badge={badge}
        actions={headerActions}
        className={headerClassName}
      />
      
      <ChatMessages
        messages={messages}
        isLoading={isLoading}
        className={messagesClassName}
        messageClassName={messageClassName}
        emptyState={emptyState}
      />
      
      <div className="bg-background/50 backdrop-blur-sm p-4">
        <ChatInputWithCommands
          value={input}
          onChange={onInputChange}
          onSubmit={onSubmit}
          onAttach={onAttach}
          placeholder={placeholder}
          disabled={isLoading}
          status={status}
          className={inputClassName}
          // Suggestions props
          enableSuggestions={enableSuggestions}
          suggestions={suggestions}
          suggestionsCount={suggestionsCount}
          onSuggestionClick={handleSuggestionClick}
          // Commands props
          enableCommands={enableCommands}
          onCommandExecute={onCommandExecute}
          onAICommandExecute={onAICommandExecute}
        />
      </div>
    </div>
  )
}