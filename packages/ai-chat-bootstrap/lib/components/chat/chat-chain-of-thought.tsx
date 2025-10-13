"use client";

import type { UIMessage } from "ai";
import isEqual from "fast-deep-equal";
import React, { useMemo } from "react";
import type { ChainOfThoughtProps } from "../../types/chain-of-thought";
import { cn } from "../../utils";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "../ai-elements/chain-of-thought";
import { Badge } from "../ui/badge";
import { ChatMessagePart } from "./chat-message-part";
import { ChatMessagePartCompact } from "./chat-message-part-compact";

/**
 * ChatChainOfThought - Optimized component for rendering chain of thought messages
 *
 * Performance optimizations applied:
 * - React.memo with custom comparison to prevent unnecessary re-renders
 * - useMemo for expensive message parsing logic
 * - useMemo for computed values (step counts)
 * - Stable keys for mapped elements to improve React reconciliation
 *
 * Follows project Zustand patterns: avoids function refs in dependencies
 */
type MessagePart = UIMessage["parts"][number];

type ChainOfThoughtStepData = {
  type: "cot-step";
  label: string;
  description?: string;
  children: MessagePart[];
};

type ChainOfThoughtMetadata = {
  name?: string;
  description?: string;
};

function ChatChainOfThoughtImpl({
  message,
  isStreaming,
  isLastMessage,
  className,
  responseProps,
}: ChainOfThoughtProps) {
  // Parse message parts to extract chain of thought data
  // Memoized to prevent expensive processing on every render
  const { cotSteps, nonCotParts, planName, planDescription } = useMemo(() => {
    let cotActive = false;
    const cotSteps: ChainOfThoughtStepData[] = [];
    let cotCurrentStep: ChainOfThoughtStepData | null = null;
    const nonCotParts: MessagePart[] = [];
    let planName: string | undefined = undefined;
    let planDescription: string | undefined = undefined;

    message?.parts?.forEach((part: MessagePart) => {
      // Start COT
      if (part.type === "tool-acb_start_chain_of_thought") {
        cotActive = true;
        const metadata = (part.input ?? {}) as ChainOfThoughtMetadata;
        planName = metadata.name || "Chain of Thought";
        planDescription = metadata.description;
        cotCurrentStep = null; // Don't create a step for the plan itself
        return;
      }
      // Start step
      if (part.type === "tool-acb_start_chain_of_thought_step" && cotActive) {
        const metadata = (part.input ?? {}) as ChainOfThoughtMetadata;
        cotCurrentStep = {
          type: "cot-step",
          label: metadata.name || "Step",
          description: metadata.description,
          children: [],
        };
        cotSteps.push(cotCurrentStep);
        return;
      }
      // End COT
      if (part.type === "tool-acb_complete_chain_of_thought" && cotActive) {
        cotActive = false;
        return;
      }
      // COT content
      if (cotActive && cotCurrentStep) {
        cotCurrentStep.children.push(part);
        return;
      }
      // Non-COT content
      nonCotParts.push(part);
    });

    return { cotSteps, nonCotParts, planName, planDescription };
  }, [message?.parts]); // Only re-process when parts change

  // Auto-expand for streaming last message, collapsed otherwise
  const defaultOpen = isStreaming && isLastMessage;

  // Memoized step counts to prevent recalculation on every render
  const { completedSteps, totalSteps } = useMemo(() => {
    const completedSteps = cotSteps.filter((step) => step.children.length > 0)
      .length;
    const totalSteps = cotSteps.length;
    return { completedSteps, totalSteps };
  }, [cotSteps]);

  // Generate stable keys to prevent unnecessary re-renders
  const getStepKey = (step: ChainOfThoughtStepData, idx: number) =>
    `${step.label}-${step.description || ""}-${idx}`;

  const getPartKey = (part: MessagePart, idx: number) => {
    if (typeof part === "object" && part && "id" in part) {
      const id = (part as { id?: string }).id;
      if (typeof id === "string" && id.length > 0) {
        return id;
      }
    }
    return `${part.type}-${idx}`;
  };

  return (
    <div className={cn(className)}>
      <ChainOfThought
        defaultOpen={defaultOpen}
        className="rounded-xl bg-background shadow-sm"
      >
        <ChainOfThoughtHeader className="gap-2">
          <div className="flex items-center justify-between min-w-0 flex-1">
            <span
              className="truncate min-w-0 flex-1"
              title={planName || "Chain of Thought"}
            >
              {planName || "Chain of Thought"}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {totalSteps > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {completedSteps}/{totalSteps} steps
                </Badge>
              )}
              {isStreaming && (
                <Badge variant="default" className="text-xs animate-pulse">
                  Active
                </Badge>
              )}
            </div>
          </div>
        </ChainOfThoughtHeader>

        <ChainOfThoughtContent>
          {/* Plan description */}
          {planDescription && (
            <div className="text-sm text-muted-foreground py-1 mb-2">
              {planDescription}
            </div>
          )}

          {/* Render COT steps */}
          {cotSteps
            .filter((step) =>
              // When streaming, show all steps (including empty ones)
              // When not streaming, only show steps with content
              isStreaming ? true : step.children.length > 0
            )
            .map((step, idx) => (
              <ChainOfThoughtStep
                key={getStepKey(step, idx)}
                label={step.label}
                description={step.description}
              >
                <div className="space-y-2">
                  {step.children.map((child, cidx) => {
                    return (
                      <ChatMessagePartCompact
                        key={getPartKey(child, cidx)}
                        part={child}
                        streaming={isStreaming}
                        responseProps={responseProps}
                      />
                    );
                  })}
                </div>
              </ChainOfThoughtStep>
            ))}
        </ChainOfThoughtContent>
      </ChainOfThought>
      {/* Render non-COT message parts as usual */}
      {nonCotParts.length > 0 && (
        <div className="space-y-2">
          {nonCotParts.map((part, idx) => (
            <ChatMessagePart
              key={getPartKey(part, idx)}
              part={part}
              streaming={isStreaming}
              responseProps={responseProps}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Performance optimization: memoize component to prevent unnecessary re-renders
// Custom comparison function ensures we only re-render when meaningful props change
export const ChatChainOfThought = React.memo(
  ChatChainOfThoughtImpl,
  (prev, next) => {
    // Fast path: check reference equality first
    if (
      prev.message === next.message &&
      prev.isStreaming === next.isStreaming &&
      prev.isLastMessage === next.isLastMessage &&
      prev.className === next.className &&
      prev.responseProps === next.responseProps
    ) {
      return true;
    }

    // Deep comparison fallback for complex cases
    return isEqual(prev, next);
  }
);
