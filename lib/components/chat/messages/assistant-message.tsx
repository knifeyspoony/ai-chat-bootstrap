import React from "react"
import { cn } from "@lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@lib/components/ui/avatar"
import { Badge } from "@lib/components/ui/badge"
import { Card } from "@lib/components/ui/card"
import type { UIMessage } from "ai"
import { FileIcon, StepForwardIcon } from "lucide-react"
import { 
  TextMessage, 
  ReasoningMessage, 
  FileMessage, 
  SourceUrlMessage,
  ToolMessage
} from "@lib/components/chat/messages"

export interface AssistantMessageProps {
  message: UIMessage
  avatar?: string
  name?: string
  className?: string
}

export function AssistantMessage({ message, avatar, name, className }: AssistantMessageProps) {
  return (
    <div className={cn("flex gap-3 px-6 py-4 w-full min-w-0", className)}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={avatar} alt={name || "Assistant"} />
        <AvatarFallback>
          {name ? name[0].toUpperCase() : "AI"}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{name || "Assistant"}</span>
          {(message as any).createdAt && (
            <span>{new Date((message as any).createdAt).toLocaleTimeString()}</span>
          )}
        </div>
        
        <div className="flex flex-col gap-2 min-w-0">
          {message.parts?.map((part: any, index: number) => (
            <div key={index} className="min-w-0">
              <MessagePart part={part} isUser={false} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MessagePart({ part, isUser }: { part: any, isUser: boolean }) {
  switch (part.type) {
    case 'text':
      return <TextMessage text={part.text} isUser={isUser} isSystem={false} />
      
    case 'reasoning':
      return <ReasoningMessage reasoning={part.reasoning} />
      
    case 'file':
      return (
        <FileMessage 
          filename={part.filename} 
          mimeType={part.mimeType} 
          url={part.url} 
        />
      )
      
    case 'source-url':
      return (
        <SourceUrlMessage 
          title={part.title} 
          url={part.url} 
        />
      )
      
    case 'source-document':
      return (
        <Card className="p-3 bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800">
          <div className="flex items-center gap-2">
            <FileIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium break-words">
                {part.title}
              </span>
              {part.filename && (
                <span className="text-xs text-purple-700 dark:text-purple-300 break-words">
                  {part.filename}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {part.mimeType}
              </span>
            </div>
          </div>
        </Card>
      )
      
    case 'step-start':
      return (
        <div className="flex items-center gap-2 py-1">
          <StepForwardIcon className="h-3 w-3 text-muted-foreground" />
          <Badge variant="secondary" className="text-xs">
            Step Started
          </Badge>
        </div>
      )
      
    default:
      // Handle tool parts
      if (part.type?.startsWith('tool-')) {
        const toolName = part.type.replace('tool-', '') || 'Unknown'
        return (
          <ToolMessage 
            toolName={toolName}
            args={(part as any).args}
            result={(part as any).result}
          />
        )
      }
      
      // Handle data parts (data-{dataPartName})
      if (part.type.startsWith('data-')) {
        const dataType = part.type.replace('data-', '')
        return (
          <Card className="p-3 bg-indigo-50 border-indigo-200 dark:bg-indigo-950 dark:border-indigo-800">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs text-indigo-700 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900">
                Data: {dataType}
              </Badge>
            </div>
            <pre className="text-xs bg-indigo-100 dark:bg-indigo-900 p-2 rounded overflow-x-auto break-all whitespace-pre-wrap min-w-0">
              {JSON.stringify(part.data || part, null, 2)}
            </pre>
          </Card>
        )
      }
      
      // Fallback for unknown part types
      return (
        <Card className="p-3 bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          <Badge variant="outline" className="text-xs mb-2">
            Unknown: {part.type}
          </Badge>
          <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto break-all whitespace-pre-wrap min-w-0">
            {JSON.stringify(part, null, 2)}
          </pre>
        </Card>
      )
  }
}