import { Pin } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../utils";
import { Toggle } from "../ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

export interface ChatMessagePinToggleProps
  extends Omit<ComponentPropsWithoutRef<typeof Toggle>, "children"> {
  pinned: boolean;
  label?: string;
  onPressedChange?: (pressed: boolean) => void;
}

export function ChatMessagePinToggle({
  pinned,
  label = pinned ? "Unpin message" : "Pin message",
  className,
  disabled,
  onPressedChange,
  ...props
}: ChatMessagePinToggleProps) {
  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            size="icon"
            aria-pressed={pinned}
            aria-label={label}
            disabled={disabled}
            pressed={pinned}
            onPressedChange={onPressedChange}
            tabIndex={0}
            className={cn(
              "flex items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition aspect-square",
              "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              pinned && "bg-primary text-primary-foreground hover:bg-primary/90",
              disabled && "pointer-events-none opacity-50",
              "shrink-0",
              className
            )}
            {...props}
          >
            <Pin className={cn("h-3.5 w-3.5", pinned ? "fill-current" : "")} />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
