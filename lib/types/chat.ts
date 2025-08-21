import { type UIMessage } from 'ai'
import type { SerializedTool } from '@lib/stores/tools'

// Focus items are full serializable objects (dumped to the prompt)
export interface FocusItem {
  id: string
  [key: string]: any
}

export interface ChatRequest {
  messages: UIMessage[]
  context?: Record<string, any>
  tools?: SerializedTool[]
  focus?: FocusItem[]
  systemPrompt?: string
}

export interface ChatResponse {
  // AI SDK handles the response format
  // This interface is for future extensibility
}