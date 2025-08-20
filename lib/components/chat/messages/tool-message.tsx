import React from 'react'
import { Card } from '@lib/components/ui/card'
import { Badge } from '@lib/components/ui/badge'
import { WrenchIcon } from 'lucide-react'

export interface ToolMessageProps {
  toolName: string
  args?: any
  result?: any
  className?: string
}

export function ToolMessage({ toolName, args, result, className }: ToolMessageProps) {
  return (
    <Card className="p-3 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800">
      <div className="flex items-center gap-2 mb-2">
        <WrenchIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <Badge variant="outline" className="text-xs text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900">
          Tool: {toolName}
        </Badge>
      </div>
      {args && (
        <pre className="text-xs bg-orange-100 dark:bg-orange-900 p-2 rounded overflow-x-auto">
          {JSON.stringify(args, null, 2)}
        </pre>
      )}
      {result && (
        <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-orange-200 dark:border-orange-700">
          <p className="text-xs text-orange-800 dark:text-orange-200 font-medium mb-1">Result:</p>
          <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  )
}