"use client";

import type { ToolUIPart } from "ai";
import { Badge } from "lib/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "lib/components/ui/collapsible";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../utils";
import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    data-acb-part="tool"
    className={cn(
      "not-prose mb-4 w-full rounded-lg border",
      "bg-[var(--acb-tool-bg)] border-[var(--acb-tool-border)]",
      className
    )}
    {...props}
  />
);

export type ToolHeaderProps = {
  type: ToolUIPart["type"] | "dynamic-tool";
  state: ToolUIPart["state"];
  className?: string;
  /**
   * Readable label to display in place of the raw type (e.g. strip tool- prefix or surface MCP name).
   */
  label?: string;
};

const getStatusBadge = (status: ToolUIPart["state"]) => {
  const labels = {
    "input-streaming": "Pending",
    "input-available": "Running",
    "output-available": "Completed",
    "output-error": "Error",
  } as const;

  const icons = {
    "input-streaming": <CircleIcon className="size-4" />,
    "input-available": <ClockIcon className="size-4 animate-pulse" />,
    "output-available": <CheckCircleIcon className="size-4 text-green-600" />,
    "output-error": <XCircleIcon className="size-4 text-red-600" />,
  } as const;

  return (
    <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const ToolHeader = ({
  className,
  type,
  state,
  label,
  ...props
}: ToolHeaderProps) => (
  <CollapsibleTrigger
    data-acb-part="tool-header"
    className={cn(
      "flex w-full items-center justify-between gap-4 p-3 rounded-t-lg",
      "bg-[var(--acb-tool-header-bg)] text-[var(--acb-tool-header-fg)]",
      className
    )}
    {...props}
  >
    <div className="flex min-w-0 items-center gap-2">
      <WrenchIcon className="size-4 shrink-0 text-muted-foreground" />
      <span
        className="max-w-[16rem] truncate text-xs font-medium leading-tight"
        title={label ?? type}
      >
        {label ?? type}
      </span>
      <div className="shrink-0">{getStatusBadge(state)}</div>
    </div>
    <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    data-acb-part="tool-content"
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolUIPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div
    data-acb-part="tool-input"
    className={cn("space-y-2 overflow-hidden p-4", className)}
    {...props}
  >
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <div
      className={cn(
        "rounded-md",
        "bg-[var(--acb-tool-input-bg)] text-[var(--acb-tool-input-fg)]"
      )}
    >
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ReactNode;
  errorText: ToolUIPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  return (
    <div
      data-acb-part="tool-output"
      className={cn("space-y-2 p-4", className)}
      {...props}
    >
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? "Error" : "Result"}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-md text-xs [&_table]:w-full",
          errorText
            ? "bg-[var(--acb-tool-error-bg)] text-[var(--acb-tool-error-fg)]"
            : "bg-[var(--acb-tool-output-bg)] text-[var(--acb-tool-output-fg)]"
        )}
      >
        {errorText && <div>{errorText}</div>}
        {output && <div>{output}</div>}
      </div>
    </div>
  );
};
