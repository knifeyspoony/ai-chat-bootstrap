import React from 'react'
import { Card } from '@lib/components/ui/card'
import { LinkIcon } from 'lucide-react'

export interface SourceUrlMessageProps {
  title?: string
  url: string
  className?: string
}

export function SourceUrlMessage({ title, url, className }: SourceUrlMessageProps) {
  return (
    <Card className="p-3 bg-secondary border-secondary">
      <div className="flex items-center gap-2">
        <LinkIcon className="h-4 w-4 text-secondary-foreground" />
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {title || 'Source'}
          </span>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-primary hover:text-primary/80 hover:underline"
          >
            {url}
          </a>
        </div>
      </div>
    </Card>
  )
}