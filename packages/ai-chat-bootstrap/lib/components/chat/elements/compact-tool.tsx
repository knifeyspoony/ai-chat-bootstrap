"use client";

import type { ToolUIPart } from "ai";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../../utils";
import { CodeBlock } from "../../ai-elements/code-block";
import { Badge } from "../../ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible";

export interface CompactToolProps {
  className?: string;
  type: ToolUIPart["type"] | "dynamic-tool";
  state: ToolUIPart["state"];
  input?: unknown;
  output?: ReactNode;
  errorText?: string;
  /**
   * Label to display instead of the raw type string.
   */
  label?: string;
}

const getStatusBadge = (status: ToolUIPart["state"]) => {
  const labels = {
    "input-streaming": "Pending",
    "input-available": "Running",
    "output-available": "Done",
    "output-error": "Error",
  } as const;

  const iconSize = { width: 12, height: 12 };

  const icons = {
    "input-streaming": <CircleIcon {...iconSize} />,
    "input-available": <ClockIcon {...iconSize} className="animate-pulse" />,
    "output-available": (
      <CheckCircleIcon {...iconSize} className="text-green-600" />
    ),
    "output-error": <XCircleIcon {...iconSize} className="text-red-600" />,
  } as const;

  return (
    <Badge
      className="gap-1 rounded-full text-xs font-semibold px-1 py-0 h-5"
      variant="secondary"
    >
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export function CompactTool({
  className,
  type,
  state,
  input,
  output,
  errorText,
  label,
}: CompactToolProps) {
  return (
    <Collapsible
      className={cn(
        "not-prose w-full rounded-md border mb-0.5 overflow-hidden",
        "bg-[var(--acb-tool-bg)] border-[var(--acb-tool-border)]",
        className
      )}
    >
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between rounded-t-md p-1 gap-1",
          "bg-[var(--acb-tool-header-bg)] text-[var(--acb-tool-header-fg)]"
        )}
      >
        <div className="flex min-w-0 items-center gap-1">
          <WrenchIcon
            size={12}
            className="size-2.5 shrink-0 text-muted-foreground"
          />
          <span
            className="max-w-[10rem] truncate text-[11px] font-medium leading-tight"
            title={label ?? type}
          >
            {label ?? type}
          </span>
          <div className="shrink-0">{getStatusBadge(state)}</div>
        </div>
        <ChevronDownIcon className="size-2.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in overflow-hidden">
        {Boolean(input) && (
          <div className="px-1 py-0.5 space-y-0.5 w-full">
            <h4 className="font-medium text-muted-foreground uppercase tracking-wide text-[8px]">
              Parameters
            </h4>
            <div className="w-full overflow-hidden">
              <div className="rounded-md bg-[var(--acb-tool-input-bg)] text-[var(--acb-tool-input-fg)] overflow-x-auto">
                <CodeBlock
                  code={JSON.stringify(input, null, 2)}
                  language="json"
                />
              </div>
            </div>
          </div>
        )}
        {(output || errorText) && (
          <div className="px-1 py-0.5 space-y-0.5 w-full">
            <h4 className="font-medium text-muted-foreground uppercase tracking-wide text-[8px]">
              {errorText ? "Error" : "Result"}
            </h4>
            <div className="w-full overflow-hidden">
              <div
                className={cn(
                  "overflow-x-auto rounded-md text-[10px] [&_table]:w-full",
                  errorText
                    ? "bg-[var(--acb-tool-error-bg)] text-[var(--acb-tool-error-fg)]"
                    : "bg-[var(--acb-tool-output-bg)] text-[var(--acb-tool-output-fg)]"
                )}
              >
                {errorText && <div>{errorText}</div>}
                {output && <div>{output}</div>}
              </div>
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
