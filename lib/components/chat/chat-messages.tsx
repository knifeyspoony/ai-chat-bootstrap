import React, { useRef, useEffect } from "react"
import { cn } from "@lib/utils"
import { Badge } from "@lib/components/ui/badge"
import { ScrollArea } from "@lib/components/ui/scroll-area"
import type { UIMessage } from "ai"
import { UserMessage } from "@lib/components/chat/messages/user-message"
import { AssistantMessage } from "@lib/components/chat/messages/assistant-message"

export interface ChatMessagesProps {
  messages: UIMessage[]
  isLoading?: boolean
  autoScroll?: boolean
  className?: string
  messageClassName?: string
  emptyState?: React.ReactNode
}

export function ChatMessages({
  messages,
  isLoading = false,
  autoScroll = true,
  className,
  messageClassName,
  emptyState
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, autoScroll])

  const defaultEmptyState = (
    <div className="flex items-center justify-center h-full text-center p-8">
      <div className="text-muted-foreground">
        <p className="text-lg mb-2">No messages yet</p>
        <p className="text-sm">Start a conversation below</p>
      </div>
    </div>
  )

  return (
    <ScrollArea className={cn("flex-1 overflow-hidden w-full min-w-0", className)}>
      <div className="flex flex-col w-full min-w-0">
        {messages.length === 0 ? (
          emptyState || defaultEmptyState
        ) : (
          messages.map((message, index) => {
            const isUser = message.role === "user"
            const isSystem = message.role === "system"
            
            if (isSystem) {
              const firstPart = message.parts?.[0]
              const systemText = firstPart && 'text' in firstPart ? firstPart.text : "System message"
              return (
                <div key={message.id || index} className={cn("flex justify-center px-6 py-4 w-full", messageClassName)}>
                  <Badge variant="outline" className="text-xs">
                    {systemText}
                  </Badge>
                </div>
              )
            }
            
            if (isUser) {
              return (
                <UserMessage 
                  key={message.id || index}
                  message={message} 
                  className={messageClassName} 
                />
              )
            }
            
            return (
              <AssistantMessage 
                key={message.id || index}
                message={message} 
                className={messageClassName} 
              />
            )
          })
        )}
        
        {isLoading && (
          <div className="flex gap-3 px-6 py-4">
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
  )
}