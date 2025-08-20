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
    <Card className="p-3 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
      <div className="flex items-center gap-2">
        <LinkIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {title || 'Source'}
          </span>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-green-700 hover:underline dark:text-green-300"
          >
            {url}
          </a>
        </div>
      </div>
    </Card>
  )
}