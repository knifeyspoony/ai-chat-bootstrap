import { create } from "zustand";

export interface FocusItem {
  id: string;
  [key: string]: unknown; // Allow any serializable data
}

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
    set((state) => ({
      focusItems: new Map(state.focusItems).set(id, { ...item, id }),
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
