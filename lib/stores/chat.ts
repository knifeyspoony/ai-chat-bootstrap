import { create } from 'zustand'
import type { UIMessage } from 'ai'

export interface ChatState {
  messages: UIMessage[]
  input: string
  isLoading: boolean
  error: string | null
  
  // Actions
  setMessages: (messages: UIMessage[]) => void
  addMessage: (message: UIMessage) => void
  setInput: (input: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearMessages: () => void
  
  // Tool execution results
  toolResults: Map<string, unknown>
  setToolResult: (toolCallId: string, result: unknown) => void
  getToolResult: (toolCallId: string) => unknown
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  input: '',
  isLoading: false,
  error: null,
  toolResults: new Map(),
  
  setMessages: (messages: UIMessage[]) => set({ messages }),
  
  addMessage: (message: UIMessage) => set(state => ({
    messages: [...state.messages, message]
  })),
  
  setInput: (input: string) => set({ input }),
  
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  
  setError: (error: string | null) => set({ error }),
  
  clearMessages: () => set({ messages: [] }),
  
  setToolResult: (toolCallId: string, result: unknown) => {
    get().toolResults.set(toolCallId, result)
  },
  
  getToolResult: (toolCallId: string) => {
    return get().toolResults.get(toolCallId)
  }
}))