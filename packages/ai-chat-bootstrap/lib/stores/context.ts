import { create } from "zustand";
import type { ContextItem } from "../types/chat";

export interface AIContextStore {
  contextItems: Map<string, ContextItem>;
  setContextItem: (item: ContextItem) => void;
  getContextItem: (id: string) => ContextItem | undefined;
  removeContextItem: (id: string) => void;
  clearContext: () => void;
  listContext: () => ContextItem[];
  serialize: () => ContextItem[]; // ready for ChatRequest
}

export const useAIContextStore = create<AIContextStore>((set, get) => ({
  contextItems: new Map<string, ContextItem>(),

  setContextItem: (item: ContextItem) => {
    const normalized: ContextItem = {
      id: item.id,
      data: item.data,
      label: item.label,
      description: item.description,
      scope: item.scope,
      priority: item.priority,
    };
    set((state) => ({
      contextItems: new Map(state.contextItems).set(item.id, normalized),
    }));
  },

  getContextItem: (id: string) => get().contextItems.get(id),

  removeContextItem: (id: string) => {
    set((state) => {
      const next = new Map(state.contextItems);
      next.delete(id);
      return { contextItems: next };
    });
  },

  clearContext: () => set({ contextItems: new Map() }),

  listContext: () =>
    Array.from(get().contextItems.values()).sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    ),

  serialize: () => get().listContext(),
}));
