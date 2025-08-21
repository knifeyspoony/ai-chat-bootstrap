import React from 'react'
import { cn } from '@lib/utils'
import { Badge } from '@lib/components/ui/badge'
import { WrenchIcon } from 'lucide-react'

export interface ToolMessageProps {
  toolName: string
  args?: any
  result?: any
  className?: string
}

export function ToolMessage({ toolName, args, result, className }: ToolMessageProps) {
  const [open, setOpen] = React.useState(false)
  const detailsId = React.useId()

  return (
    <div className={cn("min-w-0", className)}>
      <Badge asChild variant="outline" className="cursor-pointer select-none rounded-full">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1"
        >
          <WrenchIcon className="h-3 w-3" />
          <span className="truncate">Tool: {toolName}</span>
        </button>
      </Badge>

      {open && (
        <div
          id={detailsId}
          role="region"
          aria-label={`Tool ${toolName} details`}
          className="mt-2 rounded border border-border bg-muted/40 p-2"
        >
          {args && (
            <div className="mb-2">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Args</p>
              <pre className="text-xs bg-background/60 border border-border p-2 rounded overflow-x-auto break-all whitespace-pre-wrap">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {result && (
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Result</p>
              <pre className="text-xs bg-background/60 border border-border p-2 rounded overflow-x-auto whitespace-pre-wrap">
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
          {!args && !result && (
            <p className="text-xs text-muted-foreground">No details</p>
          )}
        </div>
      )}
    </div>
  )
}