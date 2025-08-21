import React from 'react'
import { cn } from '@lib/utils'
import { Badge } from '@lib/components/ui/badge'
import { MarkdownMessage } from '@lib/components/chat/messages/markdown-message'

export interface TextMessageProps {
  text: string
  isUser: boolean
  isSystem: boolean
  className?: string
  streaming?: boolean
}

export function TextMessage({ text, isUser, isSystem, className, streaming = false }: TextMessageProps) {
  return (
    <div className={cn(
      "relative rounded-xl px-3 py-2 text-sm break-words overflow-wrap-anywhere max-w-full min-w-0",
      isUser && "bg-primary text-primary-foreground",
      !isUser && !isSystem && "bg-muted",
      isSystem && "bg-accent text-accent-foreground",
      className
    )}>
      {isSystem ? (
        <Badge variant="outline" className="text-xs">
          {text}
        </Badge>
      ) : streaming ? (
        // While streaming, bypass markdown parsing entirely for minimal work
        <div className={cn(
          "whitespace-pre-wrap break-words text-sm",
          isUser && "text-inherit",
          !isUser && "dark:text-inherit"
        )}>
          {text}
        </div>
      ) : (
        <MarkdownMessage
          content={text}
          streaming={false}
          className={cn(
            "prose-headings:text-inherit prose-p:text-inherit prose-strong:text-inherit prose-em:text-inherit prose-code:text-inherit prose-pre:text-inherit prose-a:text-inherit prose-ul:text-inherit prose-ol:text-inherit prose-li:text-inherit",
            isUser && "prose-invert",
            !isUser && "dark:prose-invert"
          )}
        />
      )}
    </div>
  )
}