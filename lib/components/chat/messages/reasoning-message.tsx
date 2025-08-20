import React from 'react'
import { Card } from '@lib/components/ui/card'
import { Badge } from '@lib/components/ui/badge'
import { BrainIcon } from 'lucide-react'
import { MarkdownMessage } from '@lib/components/chat/messages/markdown-message'

export interface ReasoningMessageProps {
  reasoning: string
  className?: string
}

export function ReasoningMessage({ reasoning, className }: ReasoningMessageProps) {
  return (
    <Card className="p-3 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
      <div className="flex items-center gap-2 mb-2">
        <BrainIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <Badge variant="outline" className="text-xs text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900">
          Reasoning
        </Badge>
      </div>
      <MarkdownMessage 
        content={reasoning} 
        className="text-blue-800 dark:text-blue-200 prose-headings:text-blue-800 dark:prose-headings:text-blue-200 prose-p:text-blue-800 dark:prose-p:text-blue-200 prose-strong:text-blue-800 dark:prose-strong:text-blue-200"
      />
    </Card>
  )
}