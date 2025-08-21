import React from 'react'
import { cn } from '@lib/utils'

export interface CodeBlockMessageProps {
  children: React.ReactNode
  language?: string
  className?: string
}

export function CodeBlockMessage({ children, language: propLanguage, className }: CodeBlockMessageProps) {
  // Use the language prop directly (passed from code component)
  const language = propLanguage

  return (
    <div className={cn("relative my-1 min-w-0", className)}>
      <pre className="bg-neutral-200 dark:bg-neutral-700 border border-border px-2 py-1 rounded-md overflow-x-auto text-xs font-mono min-w-0">
        {children}
      </pre>
      {language && (
        <div className="absolute top-1 right-1 px-1 py-0.5 bg-neutral-300 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-300 text-xs rounded font-mono opacity-70 text-[10px]">
          {language}
        </div>
      )}
    </div>
  )
}

CodeBlockMessage.displayName = 'CodeBlockMessage'