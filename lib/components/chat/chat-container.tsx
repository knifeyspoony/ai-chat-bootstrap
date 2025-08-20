import React, { useRef, useEffect } from "react"
import { cn } from "@lib/utils"
import { ScrollArea } from "@lib/components/ui/scroll-area"
import type { UIMessage } from "ai"
import { ChatMessage } from "@lib/components/chat/chat-message"
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
  messageClassName?: string
  inputClassName?: string
  autoScroll?: boolean
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
  messageClassName,
  inputClassName,
  autoScroll = true
}: ChatContainerProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, autoScroll])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <div className="space-y-0">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center p-8">
              <div className="text-muted-foreground">
                <p className="text-lg mb-2">No messages yet</p>
                <p className="text-sm">Start a conversation below</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatMessage
                key={message.id || index}
                message={message}
                className={messageClassName}
              />
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-3 p-4">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="flex flex-col gap-2 max-w-[80%]">
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                <div className="rounded-lg px-3 py-2 bg-muted">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
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
  )
}