import type { ToolUIPart, UIMessage } from "ai";

export const COT_START_CHAIN_TOOL_NAME = "acb_start_chain_of_thought";
export const COT_START_STEP_TOOL_NAME = "acb_start_chain_of_thought_step";
export const COT_COMPLETE_CHAIN_TOOL_NAME = "acb_complete_chain_of_thought";

export const CHAIN_OF_THOUGHT_TOOL_NAMES = [
  COT_START_CHAIN_TOOL_NAME,
  COT_START_STEP_TOOL_NAME,
  COT_COMPLETE_CHAIN_TOOL_NAME,
] as const;

// Simplified flat structure for chain of thought
export type ChainOfThoughtItemType = "tool-execution" | "reasoning" | "text";

export interface ChainOfThoughtItem {
  id: string;
  type: ChainOfThoughtItemType;
  timestamp: number;
  status: "active" | "completed" | "pending";

  // For tool executions
  toolCallId?: string;
  toolName?: string;
  displayName?: string;
  input?: unknown;
  output?: unknown;
  error?: string;
  state?: ToolUIPart["state"];
  duration?: number;

  // For text/reasoning content
  text?: string;
}

export interface ChainOfThoughtFlow {
  id: string;
  planName: string;
  planDescription?: string;
  items: ChainOfThoughtItem[];
  status: "active" | "completed";
  startTime: number;
  endTime?: number;
}

// Component props
export interface ChainOfThoughtProps {
  message: UIMessage;
  isStreaming: boolean;
  isLastMessage: boolean;
  className?: string;
}

// Extended message metadata to include chain-of-thought data
export interface ChainOfThoughtMetadata {
  flow?: ChainOfThoughtFlow;
  createdAt?: number;
  lastUpdatedAt?: number;
}

// Extended UIMessage with chain-of-thought metadata
export interface UIMessageWithChainOfThought extends UIMessage {
  metadata?: ChainOfThoughtMetadata & Record<string, unknown>;
}

// Tool execution record for utils
export interface ToolExecutionRecord {
  toolCallId: string;
  toolName: string;
  displayName: string;
  part: ToolUIPart;
  isChainOfThought: boolean;
  timestamp: number;
}

// Chain item types for building display items
export type ChainItemType =
  | "text"
  | "reasoning"
  | "plan-step"
  | "tool-execution";

export interface ChainItem {
  type: ChainItemType;
  id: string;
  data: unknown;
  status: "complete" | "active" | "pending";
  timestamp: number;
}

// Tool type detection helpers
export type ToolType =
  | "file-operation"
  | "search"
  | "code-execution"
  | "planning"
  | "generic";

export interface ToolTypeInfo {
  type: ToolType;
  icon: unknown; // LucideIcon
  category: string;
}
