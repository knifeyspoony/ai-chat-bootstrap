import { create } from "zustand";
import type { FocusItem } from "../types/chat";

export interface AIFocusStore {
  focusItems: Map<string, FocusItem>;
  setFocus: (id: string, item: FocusItem) => void;
  getFocus: (id: string) => FocusItem | undefined;
  clearFocus: (id: string) => void;
  clearAllFocus: () => void;
  getAllFocusItems: () => FocusItem[];
  getFocusedIds: () => string[];
  hasFocusedItems: () => boolean;
  serialize: () => Record<string, FocusItem>;
}

export const useAIFocusStore = create<AIFocusStore>((set, get) => ({
  focusItems: new Map<string, FocusItem>(),

  setFocus: (id: string, item: FocusItem) => {
    // Normalize: ensure id consistency, fall back label to id
    const normalized: FocusItem = {
      id,
      label: item.label || item.id || id,
      description: item.description,
      data: item.data,
    };
    set((state) => ({
      focusItems: new Map(state.focusItems).set(id, normalized),
    }));
  },

  getFocus: (id: string) => {
    return get().focusItems.get(id);
  },

  clearFocus: (id: string) => {
    set((state) => {
      const newItems = new Map(state.focusItems);
      newItems.delete(id);
      return { focusItems: newItems };
    });
  },

  clearAllFocus: () => {
    set({ focusItems: new Map() });
  },

  getAllFocusItems: () => {
    return Array.from(get().focusItems.values());
  },

  getFocusedIds: () => {
    return Array.from(get().focusItems.keys());
  },

  hasFocusedItems: () => {
    return get().focusItems.size > 0;
  },

  serialize: () => {
    const focusItems = get().focusItems;
    return Object.fromEntries(focusItems.entries());
  },
}));
