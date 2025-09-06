import type { UIMessage } from "ai";
import type { FocusItem } from "./chat";

export interface Suggestion {
  reasoning: string; // Internal reasoning about why this suggestion
  shortSuggestion: string; // Display text (short, clickable)
  longSuggestion: string; // Full message sent when clicked
}

export interface SuggestionsRequest {
  messages: UIMessage[];
  context?: Record<string, unknown>;
  focus?: FocusItem[];
  prompt?: string; // Custom prompt for generating suggestions
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
}
