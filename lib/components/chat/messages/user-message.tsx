import React from "react"
import { cn } from "@lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@lib/components/ui/avatar"
import type { UIMessage } from "ai"
import { 
  TextMessage, 
  ReasoningMessage, 
  FileMessage, 
  SourceUrlMessage,
  ToolMessage
} from "@lib/components/chat/messages"

export interface UserMessageProps {
  message: UIMessage
  avatar?: string
  name?: string
  className?: string
}

function UserMessageComponent({ message, avatar, name, className }: UserMessageProps) {
  return (
    <div className={cn("flex flex-col px-6 py-4 w-full min-w-0", className)}>
      <div className="flex items-center gap-2 justify-end mb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {(message as any).createdAt && (
            <span>{new Date((message as any).createdAt).toLocaleTimeString()}</span>
          )}
          <span>{name || "You"}</span>
        </div>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={avatar} alt={name || "User"} />
          <AvatarFallback>
            {name ? name[0].toUpperCase() : "U"}
          </AvatarFallback>
        </Avatar>
      </div>
      
      <div className="flex flex-col gap-2 items-end min-w-0 mr-10">
        {message.parts?.map((part: any, index: number) => (
          <div key={index} className="min-w-0">
            <MessagePart part={part} isUser={true} />
          </div>
        ))}
      </div>
    </div>
  )
}

export const UserMessage = React.memo(UserMessageComponent)

function MessagePart({ part, isUser }: { part: any, isUser: boolean }) {
  switch (part.type) {
    case 'text':
      return <TextMessage text={part.text} isUser={isUser} isSystem={false} />
      
    case 'file':
      return (
        <FileMessage 
          filename={part.filename} 
          mimeType={part.mimeType} 
          url={part.url} 
        />
      )
      
    default:
      return (
        <div className="rounded-lg px-3 py-2 bg-primary text-primary-foreground text-sm max-w-full break-words overflow-wrap-anywhere">
          {JSON.stringify(part, null, 2)}
        </div>
      )
  }
}