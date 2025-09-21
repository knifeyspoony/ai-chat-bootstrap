"use client";

import { Button } from "lib/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "lib/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "lib/components/ui/tooltip";
import { MoreVertical } from "lucide-react";
import type { ComponentProps, ReactElement } from "react";
import { cn } from "../../utils";

export type ActionsProps = ComponentProps<"div"> & {
  maxVisible?: number;
};

export const Actions = ({
  className,
  children,
  maxVisible = 5,
  ...props
}: ActionsProps) => {
  const childArray = Array.isArray(children) ? children : [children];
  const validChildren = childArray.filter(Boolean) as ReactElement[];

  if (validChildren.length <= maxVisible) {
    return (
      <div className={cn("flex items-center gap-0.25", className)} {...props}>
        {children}
      </div>
    );
  }

  const visibleActions = validChildren.slice(0, maxVisible);
  const overflowActions = validChildren.slice(maxVisible);

  return (
    <div className={cn("flex items-center gap-0.25", className)} {...props}>
      {visibleActions}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="size-9 p-1.5 text-muted-foreground hover:text-foreground"
            size="sm"
            type="button"
            variant="ghost"
          >
            <MoreVertical className="h-3 w-3" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          {overflowActions.map((action, index) => {
            // Extract props from the action element
            const actionProps = action.props as ActionProps;
            const tooltip = actionProps.tooltip;
            const label = actionProps.label;
            const onClick = actionProps.onClick;
            const disabled = actionProps.disabled;

            return (
              <DropdownMenuItem
                key={`overflow-${index}`}
                onClick={(e) => onClick?.(e as any)}
                disabled={disabled}
                className="flex items-center gap-2"
              >
                {actionProps.children}
                <span className="flex-1">{label || tooltip || "Action"}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export type ActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
};

export const Action = ({
  tooltip,
  children,
  label,
  className,
  variant = "ghost",
  size = "sm",
  ...props
}: ActionProps) => {
  const button = (
    <Button
      className={cn(
        "size-9 p-1.5 text-muted-foreground hover:text-foreground relative",
        className
      )}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};
