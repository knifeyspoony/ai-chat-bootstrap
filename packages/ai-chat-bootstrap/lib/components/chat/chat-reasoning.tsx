"use client";

import type { ComponentProps } from "react";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "../../components/ai-elements/reasoning";
import { cn } from "../../utils";

export type ChatReasoningVariant = 'xs' | 'sm' | 'md' | 'lg';

export interface ChatReasoningProps extends ComponentProps<typeof Reasoning> {
  variant?: ChatReasoningVariant;
  children: string;
  isStreaming?: boolean;
}

const variantClasses: Record<ChatReasoningVariant, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: '', // default
  lg: 'text-lg',
};

export function ChatReasoning({
  variant = 'md',
  className,
  children,
  isStreaming,
  ...props
}: ChatReasoningProps) {
  return (
    <div className={cn(variantClasses[variant])}>
      <Reasoning className={className} isStreaming={isStreaming} {...props}>
        <ReasoningTrigger />
        <ReasoningContent>{children}</ReasoningContent>
      </Reasoning>
    </div>
  );
}