import React from 'react'
import { Card } from '@lib/components/ui/card'
import { FileIcon } from 'lucide-react'

export interface FileMessageProps {
  filename?: string
  mimeType?: string
  url?: string
  className?: string
}

export function FileMessage({ filename, mimeType, url, className }: FileMessageProps) {
  return (
    <Card className="p-3 bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <FileIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {filename || 'File'}
          </span>
          {mimeType && (
            <span className="text-xs text-muted-foreground">
              {mimeType}
            </span>
          )}
        </div>
      </div>
      {url && (
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline mt-1 block dark:text-blue-400"
        >
          View file
        </a>
      )}
    </Card>
  )
}