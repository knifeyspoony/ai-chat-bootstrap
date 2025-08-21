import React, { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@lib/utils"
import { Button } from "@lib/components/ui/button"
import { ChatContainer, type ChatContainerProps } from "@lib/components/chat/chat-container"
import { MessageCircleIcon, XIcon, GripVerticalIcon } from "lucide-react"

export interface ChatPopoutProps extends Omit<ChatContainerProps, 'className'> {
  // Popout specific props
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  
  // Positioning
  position?: "left" | "right"
  
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
  // Chat props
  messages,
  input,
  onInputChange,
  onSubmit,
  onAttach,
  isLoading,
  placeholder,
  title,
  subtitle,
  avatar,
  status,
  badge,
  headerActions,
  headerClassName,
  messagesClassName,
  messageClassName,
  inputClassName,
  autoScroll,
  emptyState,
  
  // Popout props
  isOpen: controlledIsOpen,
  onOpenChange,
  position = "right",
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
  
  const popoutRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef<number>(0)
  const startWidthRef = useRef<number>(0)
  
  const isOpen = controlledIsOpen ?? internalIsOpen
  const setIsOpen = onOpenChange ?? setInternalIsOpen

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

  const positionStyles = {
    left: {
      left: 0,
      transform: isOpen ? 'translateX(0)' : 'translateX(-100%)'
    },
    right: {
      right: 0,
      transform: isOpen ? 'translateX(0)' : 'translateX(100%)'
    }
  }

  const resizeHandlePosition = position === "right" ? "left-0" : "right-0"

  return (
    <>
      {/* Toggle Button */}
      {showToggleButton && (
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
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Popout */}
      <div
        ref={popoutRef}
        className={cn(
          "fixed top-0 z-50 bg-background shadow-2xl border-l border-r transition-transform duration-300 ease-in-out",
          position === "left" && "border-r",
          position === "right" && "border-l",
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
            messages={messages}
            input={input}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
            onAttach={onAttach}
            isLoading={isLoading}
            placeholder={placeholder}
            title={title}
            subtitle={subtitle}
            avatar={avatar}
            status={status}
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
            autoScroll={autoScroll}
            emptyState={emptyState}
            className="h-full"
          />
        </div>
      </div>
    </>
  )
}