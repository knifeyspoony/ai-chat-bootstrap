"use client";

import type { ComponentProps } from "react";
import { cn } from "../../../utils";
import { Response } from "../../ai-elements/response";

export type CompactResponseProps = ComponentProps<typeof Response>;

export function CompactResponse({
  className,
  ...props
}: CompactResponseProps) {
  return (
    <Response
      className={cn(
        "size-full text-[10px]",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "[&_h1]:text-xs [&_h2]:text-[10px] [&_h3]:text-[10px]",
        "[&_p]:text-[10px] [&_code]:text-[9px] [&_pre]:text-[9px]",
        className
      )}
      {...props}
    />
  );
}
