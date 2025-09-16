import { type UIMessage } from "ai";
import { z } from "zod";
import type { SerializedTool } from "../stores/tools";
import type { SerializedMCPServer } from "../stores/mcp";

export interface ChatModelOption {
  id: string;
  label?: string;
  description?: string;
}

/**
 * Focus items: minimal, explicit shape for interoperability.
 * "data" holds the full serializable payload forwarded to the LLM.
 */
export interface FocusItem {
  id: string; // internal reference
  label?: string; // short display label (chip text)
  description?: string; // optional semantic description to aid the model
  data?: Record<string, unknown>; // structured payload sent to the model
}

/**
 * Context items: broader ambient information influencing the model.
 * data is required to avoid empty shells; label/description help the model.
 */
export interface ContextItem {
  id: string;
  text: string; // fully-converted readable context line
  description?: string; // original human label/description
  priority?: number; // higher = more important (consumer may sort / trim)
  categories?: string[];
  parentId?: string;
}

/**
 * ChatRequest is sent from the frontend hook to the backend chat endpoint.
 * We now ALWAYS include an enrichedSystemPrompt constructed on the client
 * (unless a caller explicitly supplies their own enrichedSystemPrompt override).
 *
 * Precedence when resolving the final system message downstream:
 *   enrichedSystemPrompt (if provided)
 *   > systemPrompt (legacy single string)
 *   > backend/local fallback
 */
export interface ChatRequest {
  messages: UIMessage[];
  /**
   * Optional model identifier to forward to the backend. When provided, the backend
   * should dispatch the request using this model instead of its default.
   */
  model?: string;
  /**
   * Structured context list (already normalized & optionally priority-sorted).
   */
  context?: ContextItem[];
  /**
   * Serialized tools (name / description / inputSchema) forwarded to backend for registration.
   */
  tools?: SerializedTool[];
  /**
   * Full focus item objects – typically a small set of currently highlighted / selected entities.
   */
  focus?: FocusItem[];
  /**
   * Registered MCP servers serialized for backend consumption.
   * These describe remote tool providers that the backend can connect to during requests.
   */
  mcpServers?: SerializedMCPServer[];
  /**
   * Legacy direct system prompt. If present, the enrichment builder treats it as the
   * "original system prompt" and appends it verbatim at the end of the enrichedSystemPrompt.
   */
  systemPrompt?: string;
  /**
   * Enriched system prompt produced by the frontend (useAIChat hook).
   * Contains:
   *  - Standard preamble describing enhanced capabilities (tools/context/focus)
   *  - Conditional sections only when corresponding data exists
   *  - Original systemPrompt appended clearly at the end (if provided)
   *
   * Downstream services should prefer this over systemPrompt if present.
   */
  enrichedSystemPrompt?: string;
}

// Suggestions
export interface Suggestion {
  reasoning: string; // internal reasoning for traceability
  shortSuggestion: string; // concise display text
  longSuggestion: string; // full text inserted when clicked
}

export interface SuggestionsRequest {
  messages: UIMessage[];
  context?: ContextItem[];
  focus?: FocusItem[];
  tools?: { name: string; description?: string }[];
  prompt?: string;
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
}

// Zod schema for suggestions generation (shared between frontend & backend)
export const SuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        reasoning: z
          .string()
          .describe(
            "Internal reasoning about why this suggestion makes sense in context"
          ),
        shortSuggestion: z
          .string()
          .describe(
            "Short, clickable text (2-5 words) for the suggestion button"
          ),
        longSuggestion: z
          .string()
          .describe(
            "Complete, actionable user message that will be sent when clicked"
          ),
      })
    )
    .min(3)
    .max(5),
});

export type SuggestionsSchemaType = z.infer<typeof SuggestionsSchema>;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ChatResponse {
  // AI SDK handles the response format
  // This interface is for future extensibility
}
