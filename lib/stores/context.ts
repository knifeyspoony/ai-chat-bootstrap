import { create } from 'zustand'

export interface AIContextStore {
  context: Map<string, any>
  setContext: (key: string, value: any) => void
  getContext: (key?: string) => any
  clearContext: (key?: string) => void
  serialize: () => Record<string, any>
}

export const useAIContextStore = create<AIContextStore>((set, get) => ({
  context: new Map<string, any>(),
  
  setContext: (key: string, value: any) => {
    set(state => ({
      context: new Map(state.context).set(key, value)
    }))
  },
  
  getContext: (key?: string) => {
    const context = get().context
    return key ? context.get(key) : context
  },
  
  clearContext: (key?: string) => {
    set(state => {
      if (key) {
        const newContext = new Map(state.context)
        newContext.delete(key)
        return { context: newContext }
      } else {
        return { context: new Map() }
      }
    })
  },
  
  serialize: () => {
    const context = get().context
    return Object.fromEntries(context.entries())
  }
}))