import type { UIMessage } from "ai";
import { GripVerticalIcon, MessageCircleIcon, XIcon } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ChatContainer,
  type ChatContainerProps,
} from "../../components/chat/chat-container";
import { Button } from "../../components/ui/button";
import { useAIChat } from "../../hooks";
import { cn } from "../../utils";

export interface ChatPopoutProps extends ChatContainerProps {
  // If no chat is provided via ChatContainerProps, the popout can create one
  chatOptions?: {
    api?: string;
    systemPrompt?: string;
    onToolCall?: (toolCall: unknown) => void;
    initialMessages?: UIMessage[];
  };

  // Convenience callback that receives the raw input text when submitting
  onSubmit?: (input: string) => void;

  // Popout shell (layout, sizing, positioning)
  popout?: {
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    position?: "left" | "right";
    mode?: "overlay" | "inline";
    // Where the overlay should be positioned relative to: viewport (fixed) or parent (absolute)
    container?: "viewport" | "parent";
    width?: { default?: number; min?: number; max?: number };
    height?: string | number;
    className?: string; // outer fixed panel
    contentClassName?: string; // inner content wrapper
  };

  // Toggle button
  button?: {
    show?: boolean;
    label?: string;
    icon?: React.ReactNode;
    className?: string;
    // Where the toggle button should be positioned relative to: viewport (fixed) or parent (absolute)
    container?: "viewport" | "parent";
  };
}

export function ChatPopout(props: ChatPopoutProps) {
  const {
    chat: providedChat,
    chatOptions,
    onSubmit,
    header,
    ui,
    inputProps,
    suggestions,
    commands,
    state,
    popout,
    button,
  } = props;

  // Popout shell config with defaults
  const position = popout?.position ?? "right";
  const mode = popout?.mode ?? "overlay";
  const containerTarget = popout?.container ?? "viewport"; // only used in overlay mode
  const widthConfig = popout?.width ?? {};
  const defaultWidth = widthConfig.default ?? 384;
  const minWidth = widthConfig.min ?? 320;
  const maxWidth = widthConfig.max ?? 600;
  const height = popout?.height ?? "100%";
  const popoutClassName = popout?.className;
  const contentClassName = popout?.contentClassName;

  // Button config with defaults
  const showToggleButton = button?.show ?? true;
  const buttonLabel = button?.label ?? "Chat";
  const buttonIcon = button?.icon;
  const buttonClassName = button?.className;
  const buttonContainer = button?.container ?? "viewport"; // controls button positioning context

  // Open state
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const isOpen = popout?.isOpen ?? internalIsOpen;
  const setIsOpen = popout?.onOpenChange ?? setInternalIsOpen;

  // Sizing/resize state
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);

  // Manage our own input value so we can provide onSubmit(input: string)
  const [input, setInput] = useState("");

  // Always initialize an internal chat hook (safe, side-effect free until used)
  const generatedChat = useAIChat({
    systemPrompt: chatOptions?.systemPrompt,
    api: chatOptions?.api,
    onToolCall: chatOptions?.onToolCall,
    initialMessages: chatOptions?.initialMessages,
    onFinish: () => {
      // Trigger suggestions refresh when assistant finishes - with debouncing
      if (suggestions?.enabled && triggerSuggestionsRef.current) {
        const now = Date.now();
        if (now - lastSuggestionCallTime.current > 100) {
          lastSuggestionCallTime.current = now;
          triggerSuggestionsRef.current();
        }
      }
    },
  });

  // Use provided chat if available; otherwise only use generatedChat when chatOptions were passed
  const chat = providedChat ?? (chatOptions ? generatedChat : undefined);

  // Store suggestions fetch trigger
  const triggerSuggestionsRef = useRef<(() => void) | null>(null);
  const lastSuggestionCallTime = useRef<number>(0);

  // Refs for resizing
  const popoutRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const effectiveIsOpen = isOpen;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = (input ?? "").toString();
      if (!text.trim()) return;
      chat?.sendMessageWithContext(text);
      setInput("");
      onSubmit?.(text);
      // Also call any parent-provided inputProps.onSubmit
      inputProps?.onSubmit?.(e);
    },
    [chat, input, onSubmit, inputProps]
  );

  // Handle resize drag
  const handleMove = useCallback(
    (clientX: number) => {
      const deltaX =
        position === "right"
          ? startXRef.current - clientX
          : clientX - startXRef.current;

      const newWidth = Math.min(
        Math.max(startWidthRef.current + deltaX, minWidth),
        maxWidth
      );

      setWidth(newWidth);
    },
    [position, minWidth, maxWidth]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleMove(e.clientX);
    },
    [handleMove]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    },
    [handleMove]
  );

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleEnd);
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleEnd);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [handleMouseMove, handleTouchMove]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleEnd);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width, handleMouseMove, handleEnd]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.touches[0].clientX;
      startWidthRef.current = width;

      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleEnd);
      document.body.style.userSelect = "none";
    },
    [width, handleTouchMove, handleEnd]
  );

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [handleMouseMove, handleEnd, handleTouchMove]);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  // Early return for inline mode
  if (mode === "inline") {
    const resolvedValue = inputProps?.value ?? input;
    const resolvedOnChange = inputProps?.onChange ?? setInput;
    const resolvedOnSubmit =
      inputProps?.onSubmit ?? (chat ? handleSubmit : undefined);
    return (
      <>
        {/* Toggle Button for inline mode */}
        {showToggleButton && !effectiveIsOpen && (
          <Button
            onClick={toggleOpen}
            className={cn(
              buttonContainer === "viewport"
                ? "fixed bottom-6 z-40"
                : "absolute bottom-6 z-40",
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
            popoutClassName
          )}
          style={{
            width: effectiveIsOpen ? `${width}px` : "0px",
            minWidth: effectiveIsOpen ? `${minWidth}px` : "0px",
            maxWidth: effectiveIsOpen ? `${maxWidth}px` : "0px",
            height: typeof height === "number" ? `${height}px` : height,
            overflow: effectiveIsOpen ? "visible" : "hidden",
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
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-4 h-8 bg-border rounded-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center mx-auto",
                isDragging && "opacity-100 bg-primary/20"
              )}
            >
              <GripVerticalIcon
                className={cn(
                  "h-3 w-3 text-muted-foreground transition-colors",
                  isDragging && "text-primary"
                )}
              />
            </div>
          </div>

          {/* Chat Container */}
          <div className="flex-1 min-w-0 h-full">
            <ChatContainer
              chat={chat}
              inputProps={{
                value: resolvedValue,
                onChange: resolvedOnChange,
                onSubmit: resolvedOnSubmit,
                onAttach: inputProps?.onAttach,
              }}
              header={{
                ...header,
                actions: (
                  <>
                    {header?.actions}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="h-7 w-7"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </>
                ),
              }}
              ui={{
                placeholder: ui?.placeholder,
                emptyState: ui?.emptyState,
                classes: ui?.classes,
                className: cn("h-full", ui?.className, contentClassName),
              }}
              suggestions={{
                enabled: suggestions?.enabled,
                prompt: suggestions?.prompt,
                count: suggestions?.count,
                onAssistantFinish: (triggerFetch) => {
                  triggerSuggestionsRef.current = triggerFetch;
                },
                onSendMessage: (message: string) => {
                  if (chat) chat.sendMessageWithContext(message);
                  else suggestions?.onSendMessage?.(message);
                },
              }}
              commands={{
                enabled: commands?.enabled,
                onExecute: commands?.onExecute,
                onAICommandExecute: commands?.onAICommandExecute,
              }}
              state={state}
            />
          </div>
        </div>
      </>
    );
  }

  const positionStyles = {
    left: {
      left: 0,
      transform: effectiveIsOpen ? "translateX(0)" : "translateX(-100%)",
    },
    right: {
      right: 0,
      transform: effectiveIsOpen ? "translateX(0)" : "translateX(100%)",
    },
  };

  const resizeHandlePosition = position === "right" ? "left-0" : "right-0";

  return (
    <>
      {/* Toggle Button */}
      {showToggleButton && !effectiveIsOpen && (
        <Button
          onClick={toggleOpen}
          className={cn(
            buttonContainer === "viewport"
              ? "fixed bottom-6 z-40"
              : "absolute bottom-6 z-40",
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
      {effectiveIsOpen &&
        (containerTarget === "viewport" ? (
          <div
            className="fixed inset-0 bg-black/20 z-50 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        ) : (
          <div
            className="absolute inset-0 bg-black/20 z-50 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        ))}

      {/* Chat Popout */}
      <div
        ref={popoutRef}
        className={cn(
          // Position relative to viewport (fixed) or parent (absolute)
          containerTarget === "viewport" ? "fixed top-0" : "absolute inset-y-0",
          "z-50 bg-background shadow-2xl transition-transform duration-300 ease-in-out",
          position === "left" &&
            "shadow-[4px_0_24px_rgba(0,0,0,0.12)] border-r border-border/90",
          position === "right" &&
            "shadow-[-4px_0_24px_rgba(0,0,0,0.12)] border-l border-border/90",
          popoutClassName
        )}
        style={{
          ...positionStyles[position],
          width: `${width}px`,
          height: typeof height === "number" ? `${height}px` : height,
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
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-4 h-8 bg-border rounded-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center",
              isDragging && "opacity-100 bg-primary/20",
              position === "right" ? "-left-2" : "-right-2"
            )}
          >
            <GripVerticalIcon
              className={cn(
                "h-3 w-3 text-muted-foreground transition-colors",
                isDragging && "text-primary"
              )}
            />
          </div>
        </div>

        {/* Chat Container */}
        <div className={cn("h-full", contentClassName)}>
          <ChatContainer
            chat={chat}
            inputProps={{
              value: inputProps?.value ?? input,
              onChange: inputProps?.onChange ?? setInput,
              onSubmit:
                inputProps?.onSubmit ?? (chat ? handleSubmit : undefined),
              onAttach: inputProps?.onAttach,
            }}
            header={{
              ...header,
              actions: (
                <>
                  {header?.actions}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-7 w-7"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </>
              ),
            }}
            ui={{
              placeholder: ui?.placeholder,
              emptyState: ui?.emptyState,
              classes: ui?.classes,
              className: cn("h-full", ui?.className),
            }}
            suggestions={{
              enabled: suggestions?.enabled,
              prompt: suggestions?.prompt,
              count: suggestions?.count,
              onAssistantFinish: (triggerFetch) => {
                triggerSuggestionsRef.current = triggerFetch;
              },
              onSendMessage: (message: string) => {
                if (chat) chat.sendMessageWithContext(message);
                else suggestions?.onSendMessage?.(message);
              },
            }}
            commands={{
              enabled: commands?.enabled,
              onExecute: commands?.onExecute,
              onAICommandExecute: commands?.onAICommandExecute,
            }}
            state={state}
          />
        </div>
      </div>
    </>
  );
}
