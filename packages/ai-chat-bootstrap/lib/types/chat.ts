import { type UIMessage } from "ai";
import type { SerializedTool } from "../stores/tools";

// Focus items: minimal, explicit shape for interoperability.
// "data" holds the full serializable payload forwarded to the LLM.
export interface FocusItem {
  id: string; // internal reference
  label?: string; // short display label (chip text)
  description?: string; // optional semantic description to aid the model
  data?: Record<string, unknown>; // structured payload sent to the model
}

// Context items: broader ambient information influencing the model.
// data is required to avoid empty shells; label/description help the model.
export interface ContextItem {
  id: string;
  data: Record<string, unknown>;
  label?: string;
  description?: string;
  scope?: "session" | "conversation" | "message";
  priority?: number; // higher = more important (consumer may sort / trim)
}

export interface ChatRequest {
  messages: UIMessage[];
  context?: ContextItem[]; // structured context list instead of loose record
  tools?: SerializedTool[];
  focus?: FocusItem[];
  systemPrompt?: string;
}

// Suggestions
export interface Suggestion {
  reasoning: string; // internal reasoning for traceability
  shortSuggestion: string; // concise display text
  longSuggestion: string; // full text inserted when clicked
}

export interface SuggestionsRequest {
  messages: UIMessage[];
  context?: ContextItem[]; // align with ChatRequest context shape
  focus?: FocusItem[];
  prompt?: string;
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ChatResponse {
  // AI SDK handles the response format
  // This interface is for future extensibility
}
