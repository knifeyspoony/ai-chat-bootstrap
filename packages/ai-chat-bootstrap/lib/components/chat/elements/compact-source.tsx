"use client";

import { BookIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../../utils";

export interface CompactSourceProps extends ComponentProps<"a"> {
  href: string;
  title?: string;
}

export function CompactSource({
  href,
  title,
  className,
  children,
  ...props
}: CompactSourceProps) {
  return (
    <a
      className={cn(
        "flex items-center font-medium gap-1",
        className
      )}
      href={href}
      rel="noreferrer"
      target="_blank"
      {...props}
    >
      {children ?? (
        <>
          <BookIcon className="size-2.5" />
          <span className="block text-[10px]">{title}</span>
        </>
      )}
    </a>
  );
}
