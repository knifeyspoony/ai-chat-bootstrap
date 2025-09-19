import { useEffect } from "react";
import { z } from "zod";
import type { AnyFrontendTool } from "../stores/tools";
import {
  COT_COMPLETE_CHAIN_TOOL_NAME,
  COT_START_CHAIN_TOOL_NAME,
  COT_START_STEP_TOOL_NAME,
} from "../types/chain-of-thought";

// Schemas for the chain-of-thought tools
const startChainSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .describe("Provide a name here for your overall plan."),
  description: z
    .string()
    .trim()
    .optional()
    .describe("Optionally, provide a description for your overall plan."),
});

const startStepSchema = z.object({
  name: z.string().trim().min(1).describe("Provide a name here for your step."),
  description: z
    .string()
    .trim()
    .optional()
    .describe("Optionally, provide a description for your step."),
});

const completeChainSchema = z.object({
  summary: z
    .string()
    .trim()
    .optional()
    .describe(
      "Optionally, provide a summary of the work you just performed and the results, if something meaningful was learned in the context of the conversation."
    ),
});

export interface UseChainOfThoughtOptions {
  enabled: boolean;
  registerTool: (tool: AnyFrontendTool) => void;
  unregisterTool: (name: string) => void;
}

export function useChainOfThought({
  enabled,
  registerTool,
  unregisterTool,
}: UseChainOfThoughtOptions) {
  useEffect(() => {
    if (!enabled) return;

    const startChainTool = {
      name: COT_START_CHAIN_TOOL_NAME,
      description:
        "Start a new chain of thought with a name and optional description. Only use chain-of-thought tools for multi-step reasoning or actions.",
      parameters: startChainSchema,
      execute: async (rawInput: unknown) => startChainSchema.parse(rawInput),
    };

    const startStepTool = {
      name: COT_START_STEP_TOOL_NAME,
      description: "Start a new step in the current chain of thought",
      parameters: startStepSchema,
      execute: async (rawInput: unknown) => startStepSchema.parse(rawInput),
    };

    const completeChainTool = {
      name: COT_COMPLETE_CHAIN_TOOL_NAME,
      description: "Complete the chain of thought with optional summary",
      parameters: completeChainSchema,
      execute: async (rawInput: unknown) => completeChainSchema.parse(rawInput),
    };

    registerTool(startChainTool);
    registerTool(startStepTool);
    registerTool(completeChainTool);

    return () => {
      unregisterTool(COT_START_CHAIN_TOOL_NAME);
      unregisterTool(COT_START_STEP_TOOL_NAME);
      unregisterTool(COT_COMPLETE_CHAIN_TOOL_NAME);
    };
  }, [enabled, registerTool, unregisterTool]);
}
