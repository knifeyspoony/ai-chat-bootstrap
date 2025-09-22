import { Clock, Sparkles } from "lucide-react";
import React from "react";
import type { CompressionSnapshot, CompressionUsage } from "../../types/compression";
import { cn } from "../../utils";

export interface CompressionBannerProps {
  snapshot: CompressionSnapshot | null;
  usage: CompressionUsage | null;
  className?: string;
}

function formatTimestamp(timestamp?: number): string | null {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return null;
  }
  try {
    const date = new Date(timestamp);
    const time = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
    const day = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(date);
    return `${day} · ${time}`;
  } catch {
    return null;
  }
}

function formatTokens(value?: number): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return `${Math.max(Math.round(value), 0)} tokens`;
}

export const CompressionBanner: React.FC<CompressionBannerProps> = ({
  snapshot,
  usage,
  className,
}) => {
  if (!snapshot) return null;

  const timestamp = formatTimestamp(snapshot.createdAt);
  const tokensSaved = formatTokens(snapshot.tokensSaved);
  const totalTokens = formatTokens(usage?.totalTokens);
  const reason = snapshot.reason === "over-budget" ? "Budget" : "Threshold";

  return (
    <div
      data-acb-part="compression-banner"
      className={cn(
        "my-4 flex flex-col gap-3 rounded-lg border border-dashed border-[var(--acb-chat-message-system-bg)] bg-[var(--acb-chat-message-system-bg)]/40 px-4 py-3 text-xs text-muted-foreground",
        "shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 text-[var(--acb-chat-message-system-fg)]">
        <Sparkles className="h-4 w-4" />
        <span className="font-semibold uppercase tracking-wide">
          Context Compressed
        </span>
        {timestamp && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{timestamp}</span>
          </span>
        )}
      </div>

      <div className="grid gap-2 text-[11px] leading-tight sm:grid-cols-2">
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-medium text-foreground">Trigger:</span>
          <span className="rounded-full bg-background/60 px-2 py-1 text-muted-foreground">
            {reason}
          </span>
        </div>
        {snapshot.artifactIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-medium text-foreground">Artifacts:</span>
            <span className="rounded-full bg-background/60 px-2 py-1 text-muted-foreground">
              {snapshot.artifactIds.length}
            </span>
          </div>
        )}
        {tokensSaved && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-medium text-foreground">Tokens saved:</span>
            <span className="rounded-full bg-background/60 px-2 py-1 text-muted-foreground">
              {tokensSaved}
            </span>
          </div>
        )}
        {totalTokens && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-medium text-foreground">Payload size:</span>
            <span className="rounded-full bg-background/60 px-2 py-1 text-muted-foreground">
              {totalTokens}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

