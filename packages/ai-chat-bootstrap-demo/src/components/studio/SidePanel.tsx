"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PanelLeft, PanelRight } from "lucide-react";
import React from "react";

export interface SidePanelProps {
  title: string;
  side: "left" | "right";
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  children: React.ReactNode;
  className?: string;
  /** Optional rail content (icon-only vertical buttons) shown when collapsed */
  rail?: React.ReactNode;
}

/**
 * SidePanel
 * Provides a consistent container + header (title + collapse button) for studio side panels.
 * Child content should manage its own internal toolbars / actions beneath the header.
 */
export function SidePanel({
  title,
  side,
  collapsed,
  onToggleCollapse,
  children,
  className,
  rail,
}: SidePanelProps) {
  const isLeft = side === "left";
  // Using a single icon (PanelLeft) per requirements.

  return (
    <div
      data-collapsed={collapsed || undefined}
      className={cn(
        "relative flex h-full flex-col rounded-xl border bg-card backdrop-blur supports-[backdrop-filter]:bg-background/40 shadow-sm overflow-hidden",
        className
      )}
    >
      {collapsed ? (
        <div className="flex-1 flex flex-col items-center py-2 gap-2 border-b border-border/50 bg-muted/20 overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={onToggleCollapse}
            aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          >
            {isLeft ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelRight className="h-4 w-4" />
            )}
          </Button>
          {/* Rail (icon buttons) */}
          <div className="flex-1 flex flex-col items-center gap-2 overflow-y-auto scrollbar-none w-full">
            {rail}
          </div>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/20 min-h-[49px]",
              isLeft ? "pl-2" : "pr-2"
            )}
          >
            {isLeft && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={onToggleCollapse}
                aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
            <h2 className="text-sm font-medium flex-1 text-center select-none">
              {title}
            </h2>
            {!isLeft && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={onToggleCollapse}
                aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {children}
          </div>
        </>
      )}
    </div>
  );
}
