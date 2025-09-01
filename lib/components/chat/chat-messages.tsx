import React from "react"
import { cn } from "@lib/utils"
import { Badge } from "@lib/components/ui/badge"
import { getToolName, type UIMessage, type UIMessagePart, type ToolUIPart } from "ai"
import { 
  Conversation, 
  ConversationContent, 
  ConversationScrollButton 
} from "@lib/components/ai-elements/conversation"
import { 
  Message, 
  MessageContent, 
  MessageAvatar 
} from "@lib/components/ai-elements/message"
import { Response } from "@lib/components/ai-elements/response"
import { Reasoning } from "@lib/components/ai-elements/reasoning"
import { Source } from "@lib/components/ai-elements/sources"
import { 
  Tool, 
  ToolHeader, 
  ToolContent, 
  ToolInput, 
  ToolOutput 
} from "@lib/components/ai-elements/tool"
import { CodeBlock } from "@lib/components/ai-elements/code-block"
import { Loader } from "@lib/components/ai-elements/loader"

export interface ChatMessagesProps {
  messages: UIMessage[]
  isLoading?: boolean
  className?: string
  messageClassName?: string
  emptyState?: React.ReactNode
}

export function ChatMessages({
  messages,
  isLoading = false,
  className,
  messageClassName,
  emptyState
}: ChatMessagesProps) {
  const defaultEmptyState = (
    <div className="flex items-center justify-center h-full text-center p-8">
      <div className="text-muted-foreground">
        <p className="text-lg mb-2">No messages yet</p>
        <p className="text-sm">Start a conversation below</p>
      </div>
    </div>
  )

  return (
    <Conversation className={cn("flex-1", className)}>
      <ConversationContent>
        {messages.length === 0 ? (
          emptyState || defaultEmptyState
        ) : (
          messages.filter((message) => {
            // Filter out empty assistant messages (likely from cancelled requests)
            if (message.role === "assistant") {
              const hasContent = message.parts?.some(part => 
                part.type === 'text' && part.text?.trim() ||
                part.type === 'reasoning' && part.text?.trim() ||
                part.type?.startsWith('tool-') ||
                part.type?.startsWith('data-') ||
                part.type === 'file' ||
                part.type === 'source-url' ||
                part.type === 'source-document'
              )
              return hasContent
            }
            return true
          }).map((message, index) => {
            const isUser = message.role === "user"
            const isSystem = message.role === "system"
            const isLast = index === messages.length - 1
            const isStreamingLast = isLoading && isLast && message.role === "assistant"
            
            if (isSystem) {
              const firstPart = message.parts?.[0]
              const systemText = firstPart && 'text' in firstPart ? firstPart.text : "System message"
              return (
                <div key={message.id ?? index} className={cn("flex justify-center px-6 py-4 w-full", messageClassName)}>
                  <Badge variant="outline" className="text-xs">
                    {systemText}
                  </Badge>
                </div>
              )
            }
            
            return (
              <Message key={message.id ?? index} from={message.role} className={messageClassName}>
                <MessageContent>
                  {message.parts?.map((part, partIndex: number) => (
                    <MessagePart 
                      key={partIndex} 
                      part={part} 
                      streaming={isStreamingLast} 
                    />
                  ))}
                </MessageContent>
                <MessageAvatar 
                  src={isUser ? "/user-avatar.png" : "/assistant-avatar.png"} 
                  name={isUser ? "You" : "Assistant"} 
                />
              </Message>
            )
          })
        )}
        
        {isLoading && (
          <Message from="assistant">
            <MessageContent>
              <Loader />
            </MessageContent>
            <MessageAvatar src="/assistant-avatar.png" name="Assistant" />
          </Message>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}

function MessagePart({ part, streaming = false }: { part: UIMessagePart, streaming?: boolean }) {
  // Remove unused streaming parameter for now
  void streaming;
  switch (part.type) {
    case 'text':
      return <Response>{part.text}</Response>
      
    case 'reasoning':
      return <Reasoning>{part.text}</Reasoning>
      
    case 'source-url':
      return (
        <Source 
          href={part.url}
          title={part.title}
        />
      )
      
    case 'source-document':
      return (
        <Source 
          href={'#'}
          title={part.title}
        />
      )
      
    case 'file':
      return (
        <div className="rounded-lg border p-3 bg-accent">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{part.filename}</span>
            <span className="text-xs text-muted-foreground">{part.mediaType}</span>
          </div>
        </div>
      )
      
    case 'code':
      return (
        <CodeBlock 
          code={part.text} 
          language={part.language || 'text'} 
        />
      )
      
    default:
      // Handle tool-* and data-* parts
      if (part.type?.startsWith('tool-')) {
        const toolPart = part as ToolUIPart
        void getToolName(toolPart);
        return (
          <Tool>
            <ToolHeader 
              type={toolPart.type} 
              state={toolPart.state || 'input-streaming'} 
            />
            <ToolContent>
              {toolPart.input && <ToolInput input={toolPart.input} />}
              {(toolPart.output || toolPart.errorText) && (
                <ToolOutput 
                  output={toolPart.output ? (
                    typeof toolPart.output === 'string' 
                      ? toolPart.output 
                      : <CodeBlock code={JSON.stringify(toolPart.output, null, 2)} language="json" />
                  ) : undefined} 
                  errorText={toolPart.errorText} 
                />
              )}
            </ToolContent>
          </Tool>
        )
      }
  }
}