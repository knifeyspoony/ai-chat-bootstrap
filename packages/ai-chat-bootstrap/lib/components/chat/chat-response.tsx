"use client";

import type { ComponentProps } from "react";
import { Response } from "../../components/ai-elements/response";
import { cn } from "../../utils";

export type ChatResponseVariant = 'xs' | 'sm' | 'md' | 'lg';

export interface ChatResponseProps extends ComponentProps<typeof Response> {
  variant?: ChatResponseVariant;
}

const variantClasses: Record<ChatResponseVariant, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: '', // default
  lg: 'text-lg',
};

export function ChatResponse({
  variant = 'md',
  className,
  ...props
}: ChatResponseProps) {
  return (
    <div className={cn(variantClasses[variant])}>
      <Response className={className} {...props} />
    </div>
  );
}