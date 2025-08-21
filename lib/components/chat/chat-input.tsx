import React, { forwardRef } from "react"
import { cn } from "@lib/utils"
import { Button } from "@lib/components/ui/button"
import { Textarea } from "@lib/components/ui/textarea"
import { Badge } from "@lib/components/ui/badge"
import { useAIFocus } from "@lib/hooks"
import { SendIcon, PlusIcon, XIcon, SquareIcon } from "lucide-react"

export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onStop?: () => void
  onAttach?: () => void
  placeholder?: string
  disabled?: boolean
  isStreaming?: boolean
  maxRows?: number
  className?: string
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ 
    value, 
    onChange, 
    onSubmit,
    onStop, 
    onAttach, 
    placeholder = "Type your message...",
    disabled = false,
    isStreaming = false,
    maxRows = 4,
    className 
  }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (isStreaming && onStop) {
          onStop()
        } else if (value.trim() && !disabled) {
          onSubmit()
        }
      }
    }

    const handleButtonClick = () => {
      if (isStreaming && onStop) {
        onStop()
      } else if (!disabled && value.trim()) {
        onSubmit()
      }
    }

    const { allFocusItems, clearFocus } = useAIFocus()

    return (
      <div className={cn(
        "flex flex-col gap-2 bg-background",
        className
      )}>
        {/* Focus Item Chips */}
        {allFocusItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {allFocusItems.map((item) => {
              const displayText = item.title || item.name || item.id
              return (
                <Badge
                  key={item.id}
                  variant="secondary"
                  className="group flex items-center gap-1 pr-1 text-xs"
                >
                  <span className="truncate max-w-32">{displayText}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFocus(item.id)}
                    className="h-4 w-4 p-0 hover:bg-background/80 opacity-60 group-hover:opacity-100 transition-opacity"
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </Badge>
              )
            })}
          </div>
        )}

        {/* Input Row */}
        <div className="flex items-end gap-2">
          {onAttach && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onAttach}
              disabled={disabled}
              className="shrink-0"
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          )}
          
          <div className="flex-1 relative">
          <Textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "min-h-[44px] resize-none pr-12 leading-tight py-3",
              `max-h-[${maxRows * 1.5}rem]`
            )}
            rows={1}
          />
          
          <Button
            type="submit"
            size="sm"
            onClick={handleButtonClick}
            disabled={(disabled && !isStreaming) || (!isStreaming && !value.trim())}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
          >
            {isStreaming ? (
              <SquareIcon className="h-4 w-4" />
            ) : (
              <SendIcon className="h-4 w-4" />
            )}
          </Button>
          </div>
        </div>
      </div>
    )
  }
)

ChatInput.displayName = "ChatInput"