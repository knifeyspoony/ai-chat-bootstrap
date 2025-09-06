import { type UIMessage } from "ai";
import type { SerializedTool } from "../stores/tools";

// Focus items are full serializable objects (dumped to the prompt)
export interface FocusItem {
  id: string;
  [key: string]: unknown;
}

export interface ChatRequest {
  messages: UIMessage[];
  context?: Record<string, unknown>;
  tools?: SerializedTool[];
  focus?: FocusItem[];
  systemPrompt?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ChatResponse {
  // AI SDK handles the response format
  // This interface is for future extensibility
}
