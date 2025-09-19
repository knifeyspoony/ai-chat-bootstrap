"use client";

import { BrainIcon, ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../../utils";
import { Response } from "../../ai-elements/response";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible";

export interface CompactReasoningProps
  extends ComponentProps<typeof Collapsible> {
  children: string;
  isStreaming?: boolean;
  defaultOpen?: boolean;
}

export function CompactReasoning({
  className,
  children,
  isStreaming = false,
  defaultOpen = false,
  ...props
}: CompactReasoningProps) {

  return (
    <Collapsible
      data-acb-part="reasoning"
      className={cn("not-prose mb-1", className)}
      defaultOpen={defaultOpen}
      {...props}
    >
      <CollapsibleTrigger
        data-acb-part="reasoning-trigger"
        className={cn(
          "flex items-center text-[10px] gap-1",
          "text-[var(--acb-reasoning-fg)]"
        )}
      >
        <BrainIcon
          className={cn("size-2.5", "text-[var(--acb-reasoning-icon)]")}
        />
        <span className="text-[10px]">
          {isStreaming ? "Thinking..." : "Thought"}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-2.5",
            "text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        data-acb-part="reasoning-content"
        className={cn(
          "mt-1 text-[10px]",
          "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in"
        )}
      >
        <Response className="grid gap-1 text-[10px]">
          {children}
        </Response>
      </CollapsibleContent>
    </Collapsible>
  );
}
