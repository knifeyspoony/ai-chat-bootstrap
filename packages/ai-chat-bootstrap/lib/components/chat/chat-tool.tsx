"use client";

import type { ToolUIPart } from "ai";
import type { ReactNode } from "react";
import { Badge } from "../ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import { cn } from "../../utils";
import { CodeBlock } from "../ai-elements/code-block";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "../ai-elements/tool";

export type ChatToolVariant = 'xs' | 'sm' | 'md' | 'lg';

export interface ChatToolProps {
  variant?: ChatToolVariant;
  children?: ReactNode;
  className?: string;
  // Tool-specific props for conditional rendering
  type?: ToolUIPart["type"];
  state?: ToolUIPart["state"];
  input?: ToolUIPart["input"];
  output?: ReactNode;
  errorText?: ToolUIPart["errorText"];
}

const variantClasses: Record<ChatToolVariant, string> = {
  xs: [
    // Tool container
    '[&_[data-acb-part=tool]]:mb-2',
    // Tool header styling
    '[&_[data-acb-part=tool-header]]:text-xs',
    '[&_[data-acb-part=tool-header]]:p-2',
    '[&_[data-acb-part=tool-header]_.font-medium]:text-xs',
    // Tool input/output styling
    '[&_[data-acb-part=tool-input]]:p-2',
    '[&_[data-acb-part=tool-output]]:p-2',
    '[&_[data-acb-part=tool-input]_h4]:text-[10px]',
    '[&_[data-acb-part=tool-output]_h4]:text-[10px]',
    // Text size overrides (more comprehensive)
    '[&_.text-sm]:text-xs',
    '[&_.text-xs]:text-[10px]',
    '[&_.font-medium]:text-xs',
    '[&_.font-medium.text-sm]:text-xs',
    // Badge styling
    '[&_.rounded-full]:text-[10px]',
    '[&_.gap-1\\.5]:gap-1',
    '[&_.gap-1\\.5]:text-[10px]',
    '[&_.text-xs.gap-1]:text-[10px]',
    // Icons (more specific)
    '[&_.size-4]:size-3',
    '[&_[data-acb-part=tool-header]_.size-4]:size-3',
    '[&_.badge_.size-4]:size-3',
    // Code blocks and content
    '[&_pre]:text-[10px]',
    '[&_code]:text-[10px]',
    // Spacing adjustments
    '[&_.space-y-2]:space-y-1',
    '[&_.gap-2]:gap-1',
    '[&_.gap-4]:gap-2',
  ].join(' '),

  sm: [
    '[&_[data-acb-part=tool-header]]:text-sm',
    '[&_[data-acb-part=tool-header]]:p-2.5',
    '[&_[data-acb-part=tool-input]]:p-3',
    '[&_[data-acb-part=tool-output]]:p-3',
  ].join(' '),

  md: '', // default styling

  lg: [
    '[&_[data-acb-part=tool-header]]:text-base',
    '[&_[data-acb-part=tool-header]]:p-4',
    '[&_[data-acb-part=tool-input]]:p-5',
    '[&_[data-acb-part=tool-output]]:p-5',
    '[&_.text-sm]:text-base',
    '[&_.text-xs]:text-sm',
    '[&_.size-4]:size-5',
  ].join(' '),
};

const getStatusBadge = (status: ToolUIPart["state"], variant: ChatToolVariant) => {
  const labels = {
    "input-streaming": "Pending",
    "input-available": "Running",
    "output-available": "Completed",
    "output-error": "Error",
  } as const;

  const iconProps = variant === 'xs' ? { className: "text-green-600", width: 8, height: 8 } : { className: "size-4" };
  const icons = {
    "input-streaming": <CircleIcon {...(variant === 'xs' ? { width: 8, height: 8 } : { className: "size-4" })} />,
    "input-available": <ClockIcon {...(variant === 'xs' ? { width: 8, height: 8, className: "animate-pulse" } : { className: "size-4 animate-pulse" })} />,
    "output-available": <CheckCircleIcon {...(variant === 'xs' ? { width: 8, height: 8, className: "text-green-600" } : { className: "size-4 text-green-600" })} />,
    "output-error": <XCircleIcon {...(variant === 'xs' ? { width: 8, height: 8, className: "text-red-600" } : { className: "size-4 text-red-600" })} />,
  } as const;

  const badgeClasses = variant === 'xs' ? "gap-0.5 rounded-full !text-[4px] font-semibold px-1 py-0 h-3" : "gap-1.5 rounded-full text-xs";

  return (
    <Badge className={badgeClasses} variant="secondary">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export function ChatTool({
  variant = 'md',
  children,
  className,
  type,
  state,
  input,
  output,
  errorText,
  ...props
}: ChatToolProps) {
  // If tool props are provided, render conditional layout based on variant
  if (type && state !== undefined) {
    if (variant === 'xs' || variant === 'sm') {
      // Compact rendering
      const padding = variant === 'xs' ? 'p-1' : 'p-2';
      const textSize = variant === 'xs' ? 'text-xs' : 'text-sm';
      const headerTextSize = variant === 'xs' ? 'text-[10px]' : 'text-xs';

      return (
        <Collapsible
          className={cn(
            "not-prose w-full rounded-md border",
            "bg-[var(--acb-tool-bg)] border-[var(--acb-tool-border)]",
            variant === 'xs' ? 'mb-1' : 'mb-2',
            className
          )}
          {...props}
        >
          <CollapsibleTrigger
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-t-md",
              "bg-[var(--acb-tool-header-bg)] text-[var(--acb-tool-header-fg)]",
              padding
            )}
          >
            <div className="flex items-center gap-1.5">
              <WrenchIcon {...(variant === 'xs' ? { width: 8, height: 8, className: "text-muted-foreground" } : { className: "size-4 text-muted-foreground" })} />
              <span className={cn("font-medium", headerTextSize)}>{type}</span>
              {getStatusBadge(state, variant)}
            </div>
            <ChevronDownIcon {...(variant === 'xs' ? { width: 8, height: 8, className: "text-muted-foreground transition-transform group-data-[state=open]:rotate-180" } : { className: "size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" })} />
          </CollapsibleTrigger>
          <CollapsibleContent className="data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in">
            {Boolean(input) && (
              <div className={cn("space-y-1 overflow-hidden", padding)}>
                <h4 className={cn("font-medium text-muted-foreground uppercase tracking-wide", headerTextSize)}>
                  Parameters
                </h4>
                <div className="rounded-md bg-[var(--acb-tool-input-bg)] text-[var(--acb-tool-input-fg)]">
                  <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
                </div>
              </div>
            )}
            {(output || errorText) && (
              <div className={cn("space-y-1", padding)}>
                <h4 className={cn("font-medium text-muted-foreground uppercase tracking-wide", headerTextSize)}>
                  {errorText ? "Error" : "Result"}
                </h4>
                <div
                  className={cn(
                    "overflow-x-auto rounded-md",
                    textSize,
                    "[&_table]:w-full",
                    errorText
                      ? "bg-[var(--acb-tool-error-bg)] text-[var(--acb-tool-error-fg)]"
                      : "bg-[var(--acb-tool-output-bg)] text-[var(--acb-tool-output-fg)]"
                  )}
                >
                  {errorText && <div>{errorText}</div>}
                  {output && <div>{output}</div>}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    // Default rendering for md and lg variants using existing Tool components
    return (
      <div
        className={cn(variantClasses[variant], className)}
        {...props}
      >
        <Tool>
          <ToolHeader type={type} state={state} />
          <ToolContent>
            {Boolean(input) && <ToolInput input={input} />}
            {(output || errorText) && (
              <ToolOutput output={output} errorText={errorText} />
            )}
          </ToolContent>
        </Tool>
      </div>
    );
  }

  // Fallback to children if no tool props provided (backward compatibility)
  return (
    <div
      className={cn(variantClasses[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}