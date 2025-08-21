import React from "react"
import { cn } from "@lib/utils"
import type { UIMessage } from "ai"
import { ChatHeader } from "@lib/components/chat/chat-header"
import { ChatMessages } from "@lib/components/chat/chat-messages"
import { ChatInput } from "@lib/components/chat/chat-input"

export interface ChatContainerProps {
  messages: UIMessage[]
  input: string
  onInputChange: (value: string) => void
  onSubmit: () => void
  onAttach?: () => void
  isLoading?: boolean
  placeholder?: string
  className?: string
  
  // Header props
  title?: string
  subtitle?: string
  avatar?: string
  status?: "online" | "offline" | "away" | "busy"
  badge?: string
  headerActions?: React.ReactNode
  
  // Component class overrides
  headerClassName?: string
  messagesClassName?: string
  messageClassName?: string
  inputClassName?: string
  
  // Messages props
  autoScroll?: boolean
  emptyState?: React.ReactNode
}

export function ChatContainer({
  messages,
  input,
  onInputChange,
  onSubmit,
  onAttach,
  isLoading = false,
  placeholder,
  className,
  
  // Header props
  title,
  subtitle,
  avatar,
  status,
  badge,
  headerActions,
  
  // Component class overrides
  headerClassName,
  messagesClassName,
  messageClassName,
  inputClassName,
  
  // Messages props
  autoScroll = true,
  emptyState
}: ChatContainerProps) {
  return (
    <div className={cn("flex flex-col h-full bg-background overflow-hidden min-w-0", className)}>
      <ChatHeader
        title={title}
        subtitle={subtitle}
        avatar={avatar}
        status={status}
        badge={badge}
        actions={headerActions}
        className={headerClassName}
      />
      
      <ChatMessages
        messages={messages}
        isLoading={isLoading}
        autoScroll={autoScroll}
        className={cn("border-b", messagesClassName)}
        messageClassName={messageClassName}
        emptyState={emptyState}
      />
      
      <div className="bg-background p-4">
        <ChatInput
          value={input}
          onChange={onInputChange}
          onSubmit={onSubmit}
          onAttach={onAttach}
          placeholder={placeholder}
          disabled={isLoading}
          className={inputClassName}
        />
      </div>
    </div>
  )
}