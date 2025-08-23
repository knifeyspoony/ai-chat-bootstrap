import React, { useState, useRef, useEffect, useCallback, useTransition } from "react"
import { cn } from "@lib/utils"
import { Button } from "@lib/components/ui/button"
import { ChatContainer, type ChatContainerProps } from "@lib/components/chat/chat-container"
import { useAIChat } from "@lib/hooks"
import { MessageCircleIcon, XIcon, GripVerticalIcon } from "lucide-react"
import type { UIMessage } from "ai"

export interface ChatPopoutProps extends Omit<ChatContainerProps, 'className' | 'input' | 'onInputChange' | 'onSubmit' | 'messages' | 'isLoading'> {
  // Chat configuration props (replaces direct chat state)
  systemPrompt?: string
  onToolCall?: (toolCall: unknown) => void
  api?: string
  
  // Custom onSubmit that receives the input value (optional - can be handled internally)
  onSubmit?: (input: string) => void
  
  // Popout specific props
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  
  // Positioning
  position?: "left" | "right"
  
  // Layout mode
  mode?: "overlay" | "inline"
  
  // Sizing
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  height?: string | number
  
  // Styling
  className?: string
  buttonClassName?: string
  popoutClassName?: string
  
  // Toggle button
  buttonLabel?: string
  buttonIcon?: React.ReactNode
  showToggleButton?: boolean
}

export function ChatPopout({
  // Chat configuration props
  systemPrompt,
  onToolCall,
  api,
  onSubmit,
  onAttach,
  placeholder,
  title,
  subtitle,
  avatar,
  headerStatus,
  badge,
  headerActions,
  headerClassName,
  messagesClassName,
  messageClassName,
  inputClassName,
  emptyState,
  enableSuggestions,
  suggestionsPrompt,
  
  // Popout props
  isOpen: controlledIsOpen,
  onOpenChange,
  position = "right",
  mode = "overlay",
  defaultWidth = 384,
  minWidth = 320,
  maxWidth = 600,
  height = "100%",
  className,
  buttonClassName,
  popoutClassName,
  buttonLabel = "Chat",
  buttonIcon,
  showToggleButton = true
}: ChatPopoutProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [width, setWidth] = useState(defaultWidth)
  const [isDragging, setIsDragging] = useState(false)
  
  // Internal input state - prevents parent re-renders on keystroke
  const [input, setInput] = useState('')
  
  // Ref to store suggestions fetch function
  const triggerSuggestionsRef = useRef<(() => void) | null>(null)
  
  // Ref to prevent double calls to suggestions
  const lastSuggestionCallTime = useRef<number>(0)

  // Internal chat state - prevents parent re-renders on message updates
  const chat = useAIChat({
    systemPrompt,
    api,
    onToolCall,
    onFinish: () => {
      // Trigger suggestions refresh when assistant finishes - with debouncing
      if (enableSuggestions && triggerSuggestionsRef.current) {
        const now = Date.now()
        // Prevent double calls within 100ms
        if (now - lastSuggestionCallTime.current > 100) {
          lastSuggestionCallTime.current = now
          triggerSuggestionsRef.current()
        }
      }
    }
  })

  // rAF-coalesced, windowed view of messages to reduce render pressure during streaming
  const [viewMessages, setViewMessages] = useState<UIMessage[]>(chat.messages)
  const messagesRafRef = useRef<number | null>(null)
  const STREAM_WINDOW = 60
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (messagesRafRef.current) cancelAnimationFrame(messagesRafRef.current)
    messagesRafRef.current = requestAnimationFrame(() => {
      const msgs = chat.isLoading
        ? chat.messages.slice(Math.max(0, chat.messages.length - STREAM_WINDOW))
        : chat.messages
      startTransition(() => setViewMessages(msgs))
      messagesRafRef.current = null
    })
    return () => {
      if (messagesRafRef.current) {
        cancelAnimationFrame(messagesRafRef.current)
        messagesRafRef.current = null
      }
    }
  }, [chat.messages, chat.isLoading])
  
  const popoutRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef<number>(0)
  const startWidthRef = useRef<number>(0)
  
  const isOpen = controlledIsOpen ?? internalIsOpen
  const setIsOpen = onOpenChange ?? setInternalIsOpen

  // Use the same open state for both overlay and inline modes
  const effectiveIsOpen = isOpen
  
  // Wrapper for onSubmit that handles message sending internally
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    // Send message using internal chat hook
    chat.sendMessageWithContext(input)
    setInput('') // Clear input after submission
    
    // Optionally notify parent
    onSubmit?.(input)
  }, [input, chat.sendMessageWithContext, onSubmit])

  // Handle resize drag
  const handleMove = useCallback((clientX: number) => {
    const deltaX = position === "right" 
      ? startXRef.current - clientX
      : clientX - startXRef.current
    
    const newWidth = Math.min(
      Math.max(startWidthRef.current + deltaX, minWidth),
      maxWidth
    )
    
    setWidth(newWidth)
  }, [position, minWidth, maxWidth])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX)
  }, [handleMove])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()
    handleMove(e.touches[0].clientX)
  }, [handleMove])

  const handleEnd = useCallback(() => {
    setIsDragging(false)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleEnd)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleEnd)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [handleMouseMove, handleTouchMove])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startXRef.current = e.clientX
    startWidthRef.current = width
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleEnd)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width, handleMouseMove, handleEnd])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startXRef.current = e.touches[0].clientX
    startWidthRef.current = width
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleEnd)
    document.body.style.userSelect = 'none'
  }, [width, handleTouchMove, handleEnd])

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleEnd)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [handleMouseMove, handleEnd, handleTouchMove])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, setIsOpen])

  const toggleOpen = () => {
    setIsOpen(!isOpen)
  }

  // Early return for inline mode
  if (mode === "inline") {
    return (
      <>
        {/* Toggle Button for inline mode */}
        {showToggleButton && !effectiveIsOpen && (
          <Button
            onClick={toggleOpen}
            className={cn(
              "fixed bottom-6 z-40",
              position === "right" ? "right-6" : "left-6",
              buttonClassName
            )}
            size="lg"
          >
            {buttonIcon || <MessageCircleIcon className="h-5 w-5 mr-2" />}
            {buttonLabel}
          </Button>
        )}

        <div
          ref={popoutRef}
          className={cn(
            "flex h-full bg-background transition-all duration-300 ease-in-out",
            position === "left" && "border-r border-border/90",
            position === "right" && "border-l border-border/90",
            className
          )}
          style={{
            width: effectiveIsOpen ? `${width}px` : '0px',
            minWidth: effectiveIsOpen ? `${minWidth}px` : '0px',
            maxWidth: effectiveIsOpen ? `${maxWidth}px` : '0px',
            height: typeof height === 'number' ? `${height}px` : height,
            overflow: effectiveIsOpen ? 'visible' : 'hidden'
          }}
        >
        {/* Resize Handle for inline mode */}
        <div
          className={cn(
            "w-2 cursor-col-resize hover:bg-primary/20 group transition-colors flex-shrink-0",
            isDragging && "bg-primary/30",
            position === "right" ? "order-first" : "order-last"
          )}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className={cn(
            "w-4 h-8 bg-border rounded-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center mx-auto mt-4",
            isDragging && "opacity-100 bg-primary/20"
          )}>
            <GripVerticalIcon className={cn(
              "h-3 w-3 text-muted-foreground transition-colors",
              isDragging && "text-primary"
            )} />
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex-1 min-w-0 h-full">
          <ChatContainer
            messages={viewMessages}
            input={input}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            onAttach={onAttach}
            isLoading={chat.isLoading}
            status={chat.status}
            placeholder={placeholder}
            title={title}
            subtitle={subtitle}
            avatar={avatar}
            headerStatus={headerStatus}
            badge={badge}
            headerActions={
              <>
                {headerActions}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </>
            }
            headerClassName={headerClassName}
            messagesClassName={messagesClassName}
            messageClassName={messageClassName}
            inputClassName={inputClassName}
            emptyState={emptyState}
            enableSuggestions={enableSuggestions}
            suggestionsPrompt={suggestionsPrompt}
            onAssistantFinish={(triggerFetch) => {
              triggerSuggestionsRef.current = triggerFetch
            }}
            onSendMessage={(message) => {
              chat.sendMessageWithContext(message)
            }}
            className="h-full"
          />
        </div>
        </div>
      </>
    )
  }

  const positionStyles = {
    left: {
      left: 0,
      transform: effectiveIsOpen ? 'translateX(0)' : 'translateX(-100%)'
    },
    right: {
      right: 0,
      transform: effectiveIsOpen ? 'translateX(0)' : 'translateX(100%)'
    }
  }

  const resizeHandlePosition = position === "right" ? "left-0" : "right-0"

  return (
    <>
      {/* Toggle Button */}
      {showToggleButton && !effectiveIsOpen && (
        <Button
          onClick={toggleOpen}
          className={cn(
            "fixed bottom-6 z-40",
            position === "right" ? "right-6" : "left-6",
            buttonClassName
          )}
          size="lg"
        >
          {buttonIcon || <MessageCircleIcon className="h-5 w-5 mr-2" />}
          {buttonLabel}
        </Button>
      )}

      {/* Backdrop */}
      {effectiveIsOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Popout */}
      <div
        ref={popoutRef}
        className={cn(
          "fixed top-0 z-50 bg-background shadow-2xl transition-transform duration-300 ease-in-out",
          position === "left" && "shadow-[4px_0_24px_rgba(0,0,0,0.12)] border-r border-border/90",
          position === "right" && "shadow-[-4px_0_24px_rgba(0,0,0,0.12)] border-l border-border/90",
          className
        )}
        style={{
          ...positionStyles[position],
          width: `${width}px`,
          height: typeof height === 'number' ? `${height}px` : height
        }}
      >
        {/* Resize Handle */}
        <div
          className={cn(
            "absolute top-0 w-2 h-full cursor-col-resize hover:bg-primary/20 group z-10 transition-colors",
            isDragging && "bg-primary/30",
            resizeHandlePosition
          )}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 w-4 h-8 bg-border rounded-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center",
            isDragging && "opacity-100 bg-primary/20",
            position === "right" ? "-left-2" : "-right-2"
          )}>
            <GripVerticalIcon className={cn(
              "h-3 w-3 text-muted-foreground transition-colors",
              isDragging && "text-primary"
            )} />
          </div>
        </div>

        {/* Chat Container */}
        <div className={cn("h-full", popoutClassName)}>
          <ChatContainer
            messages={viewMessages}
            input={input}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            onAttach={onAttach}
            isLoading={chat.isLoading}
            status={chat.status}
            placeholder={placeholder}
            title={title}
            subtitle={subtitle}
            avatar={avatar}
            headerStatus={headerStatus}
            badge={badge}
            headerActions={
              <>
                {headerActions}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </>
            }
            headerClassName={headerClassName}
            messagesClassName={messagesClassName}
            messageClassName={messageClassName}
            inputClassName={inputClassName}
            emptyState={emptyState}
            enableSuggestions={enableSuggestions}
            suggestionsPrompt={suggestionsPrompt}
            onAssistantFinish={(triggerFetch) => {
              triggerSuggestionsRef.current = triggerFetch
            }}
            onSendMessage={(message) => {
              chat.sendMessageWithContext(message)
            }}
            className="h-full"
          />
        </div>
      </div>
    </>
  )
}