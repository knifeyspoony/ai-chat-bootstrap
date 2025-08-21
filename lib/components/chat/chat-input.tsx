import React, { forwardRef } from "react"
import { cn } from "@lib/utils"
import { Button } from "@lib/components/ui/button"
import { Textarea } from "@lib/components/ui/textarea"
import { SendIcon, PlusIcon } from "lucide-react"

export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onAttach?: () => void
  placeholder?: string
  disabled?: boolean
  maxRows?: number
  className?: string
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ 
    value, 
    onChange, 
    onSubmit, 
    onAttach, 
    placeholder = "Type your message...",
    disabled = false,
    maxRows = 4,
    className 
  }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (value.trim() && !disabled) {
          onSubmit()
        }
      }
    }

    return (
      <div className={cn(
        "flex items-end gap-2 p-4 bg-background",
        className
      )}>
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
              "min-h-[44px] resize-none pr-12",
              `max-h-[${maxRows * 1.5}rem]`
            )}
            rows={1}
          />
          
          <Button
            type="submit"
            size="sm"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className="absolute right-2 bottom-2 h-8 w-8 p-0"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }
)

ChatInput.displayName = "ChatInput"