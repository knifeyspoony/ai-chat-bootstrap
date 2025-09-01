import React from "react"
import { cn } from "@lib/utils"
import { Badge } from "@lib/components/ui/badge"
import { Alert, AlertDescription } from "@lib/components/ui/alert"
import { useAIFocus } from "@lib/hooks"
import { useChatStore } from "@lib/stores/chat"
import { PlusIcon, XIcon, RotateCcwIcon, SparklesIcon } from "lucide-react"
import { 
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit
} from "@lib/components/ai-elements/prompt-input"
import { 
  DropdownMenu,
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger 
} from "@lib/components/ui/dropdown-menu"
import type { ChatStatus } from "ai"
import type { Suggestion } from "@lib/types/suggestions"

export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  // onStop is handled by status now
  onAttach?: () => void
  onRetry?: () => void
  placeholder?: string
  disabled?: boolean
  status?: ChatStatus
  maxRows?: number
  className?: string
  onKeyDown?: (e: React.KeyboardEvent) => void
  
  // Suggestions props
  enableSuggestions?: boolean
  suggestions?: Suggestion[]
  suggestionsCount?: number
  onSuggestionClick?: (suggestion: Suggestion) => void
}

export const ChatInput = ({
  value,
  onChange,
  onSubmit,
  onAttach,
  onRetry,
  placeholder = "Type your message...",
  disabled = false,
  status,
  maxRows = 4,
  className,
  onKeyDown,
  
  // Suggestions props
  enableSuggestions = false,
  suggestions = [],
  suggestionsCount = 3,
  onSuggestionClick
}: ChatInputProps) => {
    const { allFocusItems, clearFocus } = useAIFocus()
    const error = useChatStore(state => state.error)
    const setError = useChatStore(state => state.setError)

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mx-1">
            <AlertDescription className="flex items-center justify-between">
              <span className="flex-1">{error}</span>
              <div className="flex items-center gap-1">
                {onRetry && (
                  <PromptInputButton
                    onClick={onRetry}
                    className="h-6 w-6 p-0 hover:bg-background/20"
                    title="Retry last message"
                  >
                    <RotateCcwIcon className="h-3 w-3" />
                  </PromptInputButton>
                )}
                <PromptInputButton
                  onClick={() => setError(null)}
                  className="h-6 w-6 p-0 hover:bg-background/20"
                  title="Dismiss error"
                >
                  <XIcon className="h-3 w-3" />
                </PromptInputButton>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Focus Item Chips */}
        {allFocusItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {allFocusItems.map((item) => {
              const displayText = String((item as any).title ?? (item as any).name ?? item.id)
              return (
                <Badge
                  key={item.id}
                  variant="secondary"
                  className="group flex items-center gap-1 pr-1 text-xs"
                >
                  <span className="truncate max-w-32">{displayText}</span>
                  <PromptInputButton
                    onClick={() => clearFocus(item.id)}
                    className="h-4 w-4 p-0 hover:bg-background/80 opacity-60 group-hover:opacity-100 transition-opacity"
                  >
                    <XIcon className="h-3 w-3" />
                  </PromptInputButton>
                </Badge>
              )
            })}
          </div>
        )}

        <PromptInput onSubmit={onSubmit} className="w-full">
          <PromptInputTextarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            maxHeight={maxRows * 24}
            onKeyDown={onKeyDown}
          />
          <PromptInputToolbar>
            <PromptInputTools>
              {onAttach && (
                <PromptInputButton
                  onClick={onAttach}
                  disabled={disabled}
                >
                  <PlusIcon className="h-4 w-4" />
                </PromptInputButton>
              )}
            </PromptInputTools>
            
            {/* Right side buttons group - Suggestions + Send */}
            <div className="flex gap-1">
              {/* AI Suggestions Button */}
              {enableSuggestions && (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <PromptInputButton
                      type="button"
                      disabled={!suggestions || suggestions.length === 0}
                      className={cn(
                        suggestions && suggestions.length > 0 && "text-primary hover:text-primary"
                      )}
                    >
                      <SparklesIcon className="h-4 w-4" />
                    </PromptInputButton>
                  </DropdownMenuTrigger>
                  {suggestions && suggestions.length > 0 && (
                    <DropdownMenuContent 
                      align="end" 
                      side="top" 
                      className="w-80"
                      sideOffset={8}
                    >
                      <DropdownMenuLabel>AI Suggestions</DropdownMenuLabel>
                      {suggestions
                        .slice(0, Math.min(Math.max(suggestionsCount, 1), 10))
                        .map((suggestion, index) => (
                          <DropdownMenuItem
                            key={index}
                            onClick={() => onSuggestionClick?.(suggestion)}
                            className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="flex flex-col gap-1 py-1">
                              <span className="font-medium leading-tight">
                                {suggestion.shortSuggestion}
                              </span>
                              {suggestion.shortSuggestion !== suggestion.longSuggestion && (
                                <span className="text-xs text-muted-foreground leading-tight">
                                  {suggestion.longSuggestion}
                                </span>
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  )}
                </DropdownMenu>
              )}
              
              <PromptInputSubmit
                status={status}
                disabled={disabled || !value.trim()}
              />
            </div>
          </PromptInputToolbar>
        </PromptInput>
      </div>
    )
  }

ChatInput.displayName = "ChatInput"