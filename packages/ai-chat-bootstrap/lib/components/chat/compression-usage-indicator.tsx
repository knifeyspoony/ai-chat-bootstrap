import { Info, TriangleAlert } from "lucide-react";
import React, { useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Badge } from "../../components/ui/badge";
import type { CompressionController } from "../../types/compression";
import { cn } from "../../utils";

export interface CompressionUsageIndicatorProps {
  compression?: CompressionController;
  className?: string;
}

function toPercent(used: number, budget: number): number {
  if (!Number.isFinite(used) || !Number.isFinite(budget) || budget <= 0) {
    return 0;
  }
  return Math.min(Math.max((used / budget) * 100, 0), 999);
}

export const CompressionUsageIndicator: React.FC<CompressionUsageIndicatorProps> = ({
  compression,
  className,
}) => {
  const usage = compression?.usage;
  const metadata = compression?.metadata;
  const budget = usage?.budget ?? compression?.config?.maxTokenBudget ?? null;
  const remaining = usage?.remainingTokens;
  const totalTokens = usage?.totalTokens;
  const overBudget = Boolean(compression?.overBudget);
  const latestError = useMemo(() => {
    const events = compression?.events;
    if (!Array.isArray(events) || events.length === 0) return null;

    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      if (!event) continue;
      const level = event.level ?? (event.type === "error" ? "error" : undefined);
      if (level === "error") {
        return event;
      }
    }

    return null;
  }, [compression?.events]);
  const errorPhase =
    typeof latestError?.payload?.phase === "string"
      ? (latestError.payload.phase as string)
      : undefined;
  const errorMessage = latestError?.message ?? "Compression run failed";

  const percentUsed = useMemo(() => {
    if (budget === null || budget <= 0 || totalTokens === undefined) return null;
    return Math.round(toPercent(totalTokens, budget));
  }, [budget, totalTokens]);

  const label = useMemo(() => {
    if (latestError) return "Compression error";
    if (overBudget) return "Over budget";
    if (percentUsed !== null) return `${percentUsed}% used`;
    if (totalTokens !== undefined) return `${Math.round(totalTokens)} tokens`;
    return "Compression";
  }, [latestError, overBudget, percentUsed, totalTokens]);

  const showAlert = overBudget || Boolean(latestError);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium",
            showAlert && "border-destructive text-destructive",
            className
          )}
          title={
            latestError
              ? `Compression error: ${errorMessage}`
              : "View compression usage"
          }
        >
          {showAlert ? (
            <TriangleAlert className="h-3.5 w-3.5" />
          ) : (
            <Info className="h-3.5 w-3.5" />
          )}
          <span>{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 text-sm">
        <div className="flex flex-col gap-3">
          {latestError && (
            <div
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              role="alert"
            >
              <div className="flex items-center gap-2 font-medium">
                <TriangleAlert className="h-3.5 w-3.5" />
                <span>Compression error</span>
              </div>
              {errorPhase && (
                <p className="mt-1 text-[11px] uppercase tracking-wide opacity-80">
                  Phase: {errorPhase}
                </p>
              )}
              {errorMessage && (
                <p className="mt-2 text-[11px] leading-relaxed opacity-90">
                  {errorMessage}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Context usage</span>
            {overBudget && (
              <Badge variant="destructive" className="text-xs">
                Over budget
              </Badge>
            )}
          </div>

          <div className="grid gap-2 text-xs text-muted-foreground">
            {metadata &&
              Boolean(
                metadata.modelLabel ??
                  metadata.modelId ??
                  metadata.contextWindowTokens ??
                  metadata.maxOutputTokens
              ) && (
              <div className="flex flex-col gap-1">
                <span className="font-medium text-foreground">Model</span>
                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant="secondary" className="text-[11px] font-medium">
                    {metadata.modelLabel ?? metadata.modelId ?? "Model"}
                  </Badge>
                  {metadata.contextWindowTokens && (
                    <span>
                      Context window: {metadata.contextWindowTokens.toLocaleString()} tokens
                    </span>
                  )}
                  {metadata.maxOutputTokens && (
                    <span>
                      Max output: {metadata.maxOutputTokens.toLocaleString()} tokens
                    </span>
                  )}
                </div>
              </div>
              )}

            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground">Usage</span>
              <div className="grid gap-1">
                {totalTokens !== undefined && (
                  <span>
                    Total: <strong>{Math.round(totalTokens).toLocaleString()}</strong> tokens
                  </span>
                )}
                {remaining !== undefined && budget !== null && (
                  <span>
                    Remaining: {Math.max(Math.round(remaining), 0).toLocaleString()} tokens
                  </span>
                )}
                {usage?.pinnedTokens !== undefined && (
                  <span>
                    Pinned: {Math.round(usage.pinnedTokens).toLocaleString()} tokens
                  </span>
                )}
                {usage?.artifactTokens !== undefined && (
                  <span>
                    Artifacts: {Math.round(usage.artifactTokens).toLocaleString()} tokens
                  </span>
                )}
                {usage?.survivingTokens !== undefined && (
                  <span>
                    Surviving turns: {Math.round(usage.survivingTokens).toLocaleString()} tokens
                  </span>
                )}
              </div>
            </div>

            {budget !== null && (
              <div className="text-xs">
                <span className="font-medium text-foreground">Budget</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full bg-primary transition-all",
                        showAlert && "bg-destructive"
                      )}
                      style={{
                        width: `${percentUsed !== null ? percentUsed : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-foreground">
                    {percentUsed !== null
                      ? `${percentUsed}%`
                      : `${Math.round((totalTokens ?? 0)).toLocaleString()} / ${Math.round(budget).toLocaleString()}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {usage?.estimatedResponseTokens !== undefined && (
            <div className="rounded-md bg-muted/60 px-2 py-2 text-[11px]">
              Estimated response allocation: {Math.round(usage.estimatedResponseTokens).toLocaleString()} tokens
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
