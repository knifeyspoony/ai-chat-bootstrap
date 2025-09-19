"use client";

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

export function ChatChainOfThought({
  message,
  isStreaming,
  isLastMessage,
  className,
}: ChainOfThoughtProps) {
  // State machine for COT rendering
  let cotActive = false;
  const cotSteps: Array<any> = [];
  let cotCurrentStep: any = null;
  const nonCotParts: Array<any> = [];
  let planName: string | undefined = undefined;
  let planDescription: string | undefined = undefined;

  message?.parts?.forEach((part: any) => {
    // Start COT
    if (part.type === "tool-acb_start_chain_of_thought") {
      cotActive = true;
      planName = part.input?.name || "Chain of Thought";
      planDescription = part.input?.description;
      cotCurrentStep = null; // Don't create a step for the plan itself
      return;
    }
    // Start step
    if (part.type === "tool-acb_start_chain_of_thought_step" && cotActive) {
      cotCurrentStep = {
        type: "cot-step",
        label: part.input?.name || "Step",
        description: part.input?.description,
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

  // Auto-expand for streaming last message, collapsed otherwise
  const defaultOpen = isStreaming && isLastMessage;

  // Calculate step counts
  const completedSteps = cotSteps.filter(
    (step: any) => step.children.length > 0
  ).length;
  const totalSteps = cotSteps.length;

  return (
    <div className={cn(className)}>
      <ChainOfThought
        defaultOpen={defaultOpen}
        className="rounded-xl bg-background shadow-sm"
      >
        <ChainOfThoughtHeader>
          <div className="flex flex-1">
            <span>
              {planName || "Chain of Thought"}
              {totalSteps > 0 && ` (${completedSteps}/${totalSteps})`}
            </span>
            {isStreaming && (
              <Badge variant="default" className="text-xs animate-pulse">
                Active
              </Badge>
            )}
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
            .filter((step: any) =>
              // When streaming, show all steps (including empty ones)
              // When not streaming, only show steps with content
              isStreaming ? true : step.children.length > 0
            )
            .map((step: any, idx: number) => (
              <ChainOfThoughtStep
                key={idx}
                label={step.label}
                description={step.description}
              >
                {step.children.map((child: any, cidx: number) => {
                  return (
                    <ChatMessagePart
                      key={cidx}
                      part={child}
                      streaming={isStreaming}
                      variant="xs"
                    />
                  );
                })}
              </ChainOfThoughtStep>
            ))}
        </ChainOfThoughtContent>
      </ChainOfThought>
      {/* Render non-COT message parts as usual */}
      {nonCotParts.length > 0 && (
        <div className="space-y-2">
          {nonCotParts.map((part: any, idx: number) => (
            <ChatMessagePart key={idx} part={part} streaming={isStreaming} />
          ))}
        </div>
      )}
    </div>
  );
}
