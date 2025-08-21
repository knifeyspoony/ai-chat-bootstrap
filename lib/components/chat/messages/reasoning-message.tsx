import React from 'react'
import { Card } from '@lib/components/ui/card'
import { Badge } from '@lib/components/ui/badge'
import { BrainIcon } from 'lucide-react'
import { MarkdownMessage } from '@lib/components/chat/messages/markdown-message'

export interface ReasoningMessageProps {
  reasoning: string
  className?: string
}

function ReasoningMessageComponent({ reasoning, className }: ReasoningMessageProps) {
  return (
    <Card className="p-3 bg-secondary border-secondary">
      <div className="flex items-center gap-2 mb-2">
        <BrainIcon className="h-4 w-4 text-secondary-foreground" />
        <Badge variant="outline" className="text-xs text-secondary-foreground bg-secondary/50">
          Reasoning
        </Badge>
      </div>
      <MarkdownMessage
        // Disable code highlighting for reasoning to keep it lightweight
        streaming={true}
        content={reasoning}
        className="text-secondary-foreground prose-headings:text-secondary-foreground prose-p:text-secondary-foreground prose-strong:text-secondary-foreground"
      />
    </Card>
  )
}

export const ReasoningMessage = React.memo(ReasoningMessageComponent)