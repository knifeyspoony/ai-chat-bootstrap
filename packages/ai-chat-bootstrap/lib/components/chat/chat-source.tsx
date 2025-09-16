"use client";

import type { ComponentProps } from "react";
import { Source } from "../../components/ai-elements/sources";
import { cn } from "../../utils";

export type ChatSourceVariant = 'xs' | 'sm' | 'md' | 'lg';

export interface ChatSourceProps extends ComponentProps<typeof Source> {
  variant?: ChatSourceVariant;
}

const variantClasses: Record<ChatSourceVariant, string> = {
  xs: 'text-xs [&_.h-4]:h-3 [&_.w-4]:w-3',
  sm: 'text-sm',
  md: '', // default
  lg: 'text-lg [&_.h-4]:h-5 [&_.w-4]:w-5',
};

export function ChatSource({
  variant = 'md',
  className,
  ...props
}: ChatSourceProps) {
  return (
    <div className={cn(variantClasses[variant])}>
      <Source className={className} {...props} />
    </div>
  );
}