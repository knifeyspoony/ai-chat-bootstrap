import {
  BotMessageSquare,
  Calculator,
  Loader2,
  Percent,
  TriangleAlert,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import type { CompressionController } from "../../types/compression";
import { cn } from "../../utils";
import { calculateTokensForMessages } from "../../utils/compression/token-helpers";

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

function getGradientColor(percentage: number, muted: boolean = false): string {
  // Clamp percentage between 0 and 100
  const clampedPercent = Math.min(Math.max(percentage, 0), 100);

  // Create a smooth gradient from green (0%) to yellow (50%) to red (100%)
  if (clampedPercent <= 50) {
    // Green to yellow
    const ratio = clampedPercent / 50;
    const red = Math.round(34 + (255 - 34) * ratio); // From green's red component to yellow's
    const green = Math.round(197 + (255 - 197) * ratio); // From green's green component to yellow's
    const blue = Math.round(94 * (1 - ratio)); // From green's blue component to yellow's (0)

    if (muted) {
      // Make it much more muted by reducing saturation and adding transparency
      return `rgba(${red}, ${green}, ${blue}, 0.15)`;
    }
    return `rgb(${red}, ${green}, ${blue})`;
  } else {
    // Yellow to red
    const ratio = (clampedPercent - 50) / 50;
    const red = 255; // Stay at max red
    const green = Math.round(255 * (1 - ratio)); // Fade from yellow's green to red's (0)
    const blue = 0; // Stay at 0

    if (muted) {
      // Make it much more muted by reducing saturation and adding transparency
      return `rgba(${red}, ${green}, ${blue}, 0.15)`;
    }
    return `rgb(${red}, ${green}, ${blue})`;
  }
}

export const CompressionUsageIndicator: React.FC<
  CompressionUsageIndicatorProps
> = ({ compression, className }) => {
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
      const level =
        event.level ?? (event.type === "error" ? "error" : undefined);
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
    if (budget === null || budget <= 0 || totalTokens === undefined)
      return null;
    return Math.round(toPercent(totalTokens, budget));
  }, [budget, totalTokens]);

  const showAlert = overBudget || Boolean(latestError);

  const displayValue = useMemo(() => {
    if (percentUsed !== null) {
      return `${percentUsed}%`;
    }
    return "--%";
  }, [percentUsed]);

  const computedPinnedTokens = useMemo(() => {
    const pins = compression?.pinnedMessages ?? [];
    if (!pins.length) return undefined;
    const pinMessages = pins
      .map((pin) => pin.message)
      .filter((message): message is NonNullable<typeof message> =>
        Boolean(message)
      );
    if (!pinMessages.length) return 0;
    return calculateTokensForMessages(pinMessages);
  }, [compression?.pinnedMessages]);

  const pinnedTokens = useMemo(() => {
    if (usage?.pinnedTokens !== undefined) {
      if (
        computedPinnedTokens !== undefined &&
        Math.abs(computedPinnedTokens - usage.pinnedTokens) > 0.5
      ) {
        return computedPinnedTokens;
      }
      return usage.pinnedTokens;
    }
    return computedPinnedTokens;
  }, [computedPinnedTokens, usage?.pinnedTokens]);

  const accessibleLabel = useMemo(() => {
    const parts: string[] = [];
    if (latestError) {
      parts.push(`Compression error: ${errorMessage}`);
    } else {
      parts.push("Compression usage");
    }
    if (percentUsed !== null) {
      parts.push(`${percentUsed}% used`);
    } else if (totalTokens !== undefined) {
      parts.push(`${Math.round(totalTokens)} tokens in context`);
    }
    if (overBudget) {
      parts.push("Over budget");
    }
    return parts.join(". ");
  }, [latestError, errorMessage, percentUsed, totalTokens, overBudget]);

  const buttonTitle = latestError
    ? `Compression error: ${errorMessage}`
    : "View compression usage";

  const gradientColor = useMemo(() => {
    if (percentUsed === null) return "rgba(34, 197, 94, 0.15)"; // Default muted green
    return getGradientColor(percentUsed, true); // Use muted colors for background
  }, [percentUsed]);

  const progressGradientColor = useMemo(() => {
    if (percentUsed === null) return "rgb(34, 197, 94)"; // Default green for progress bars
    return getGradientColor(percentUsed, false); // Use vibrant colors for progress bars
  }, [percentUsed]);

  const textClassName = cn(
    "relative font-mono text-[11px] font-semibold leading-none",
    showAlert ? "text-destructive" : "text-muted-foreground"
  );

  const runCompression = compression?.runCompression;
  const canManuallyCompress = Boolean(runCompression);
  const [isCompressing, setIsCompressing] = useState(false);
  const handleManualCompression = useCallback(async () => {
    if (!runCompression || isCompressing) return;
    setIsCompressing(true);
    try {
      await runCompression({ force: true, reason: "manual" });
    } catch {
      /* swallow errors - event stream handles surfacing */
    } finally {
      setIsCompressing(false);
    }
  }, [isCompressing, runCompression]);

  return (
    <Popover>
      <TooltipProvider delayDuration={200} skipDelayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "relative inline-flex h-6 min-w-[2.5rem] items-center justify-center overflow-hidden rounded-full border border-border/50 px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all",
                  showAlert && "border-destructive/70 bg-destructive/10",
                  className
                )}
                style={{
                  backgroundColor: showAlert ? undefined : gradientColor,
                }}
                aria-label={accessibleLabel}
              >
                <span className={textClassName}>{displayValue}</span>
                <span className="sr-only">{accessibleLabel}</span>
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs leading-tight">
            {buttonTitle}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="end" className="w-80 text-sm">
        <div className="flex flex-col gap-5">
          {latestError && (
            <div
              className="rounded-lg border border-destructive/20 bg-gradient-to-r from-destructive/5 to-destructive/10 p-4 text-destructive shadow-sm"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-destructive/10 p-1">
                  <TriangleAlert className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="font-semibold text-sm">Compression Error</div>
                  {errorPhase && (
                    <div className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wider">
                      {errorPhase}
                    </div>
                  )}
                  {errorMessage && (
                    <p className="text-xs leading-relaxed text-destructive/80">
                      {errorMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base text-foreground">
                Context Usage
              </h3>
              {overBudget && (
                <Badge variant="destructive" className="text-xs font-medium">
                  Over Budget
                </Badge>
              )}
            </div>

            {metadata &&
              Boolean(
                metadata.modelLabel ??
                  metadata.modelId ??
                  metadata.contextWindowTokens ??
                  metadata.maxOutputTokens
              ) && (
                <div className="rounded-lg bg-muted/30 p-3 space-y-3">
                  <div className="flex items-left gap-2">
                    <BotMessageSquare />
                    <span className="font-medium text-sm text-foreground">
                      Model Information
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Badge
                      variant="secondary"
                      className="text-xs font-medium px-2 py-1"
                    >
                      {metadata.modelLabel ?? metadata.modelId ?? "Model"}
                    </Badge>
                    <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                      {metadata.contextWindowTokens && (
                        <div className="flex justify-between">
                          <span>Context window:</span>
                          <span className="font-medium text-foreground">
                            {metadata.contextWindowTokens.toLocaleString()}{" "}
                            tokens
                          </span>
                        </div>
                      )}
                      {metadata.maxOutputTokens && (
                        <div className="flex justify-between">
                          <span>Max output:</span>
                          <span className="font-medium text-foreground">
                            {metadata.maxOutputTokens.toLocaleString()} tokens
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            <div className="rounded-lg bg-muted/30 p-3 space-y-3">
              <div className="flex items-center gap-2 -ml-1">
                <Calculator />
                <span className="font-medium text-sm text-foreground">
                  Token Usage
                </span>
              </div>
              <div className="grid gap-2 text-xs">
                {totalTokens !== undefined && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Total:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-foreground">
                        {Math.round(totalTokens).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        tokens
                      </span>
                    </div>
                  </div>
                )}
                {remaining !== undefined && budget !== null && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Remaining:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-foreground">
                        {Math.max(Math.round(remaining), 0).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        tokens
                      </span>
                    </div>
                  </div>
                )}
                {pinnedTokens !== undefined && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Pinned:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-foreground">
                        {Math.round(pinnedTokens).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        tokens
                      </span>
                    </div>
                  </div>
                )}
                {usage?.artifactTokens !== undefined && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Artifacts:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-foreground">
                        {Math.round(usage.artifactTokens).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        tokens
                      </span>
                    </div>
                  </div>
                )}
                {usage?.survivingTokens !== undefined && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">
                      Surviving turns:
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-foreground">
                        {Math.round(usage.survivingTokens).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        tokens
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {canManuallyCompress && (
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="w-full justify-center"
                  onClick={handleManualCompression}
                  disabled={isCompressing}
                >
                  {isCompressing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Compressing...
                    </>
                  ) : (
                    "Compress conversation"
                  )}
                </Button>
              )}
            </div>

            {budget !== null && (
              <div className="rounded-lg bg-muted/30 p-3 space-y-3">
                <div className="flex items-center gap-2 -ml-1">
                  <Percent />
                  <span className="font-medium text-sm text-foreground">
                    Budget Usage
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full w-full flex-1 transition-all rounded-full"
                        style={{
                          transform: `translateX(-${
                            100 - (percentUsed || 0)
                          }%)`,
                          backgroundColor: showAlert
                            ? "hsl(var(--destructive))"
                            : progressGradientColor,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-foreground">
                    {percentUsed !== null
                      ? `${percentUsed}%`
                      : `${Math.round(
                          totalTokens ?? 0
                        ).toLocaleString()} / ${Math.round(
                          budget
                        ).toLocaleString()}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {usage?.estimatedResponseTokens !== undefined && (
            <div className="rounded-lg bg-gradient-to-r from-green-50/50 to-blue-50/50 dark:from-green-950/20 dark:to-blue-950/20 border border-primary/10 p-3">
              <div className="flex items-center gap-2 mb-2 -ml-1">
                <div className="h-2 w-2 rounded-full bg-green-500/60"></div>
                <span className="font-medium text-sm text-foreground">
                  Response Allocation
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Estimated tokens:
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-foreground">
                    {Math.round(usage.estimatedResponseTokens).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    tokens
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
