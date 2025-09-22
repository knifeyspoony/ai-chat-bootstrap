import { create } from "zustand";

export interface BranchSelectionStoreState {
  /**
   * Maps assistant message ids to the branch id currently selected in the UI.
   * The branch id corresponds to the `UIMessage.id` of the rendered variant.
   */
  selection: Map<string, string>;
  /**
   * Replace the stored branch selection for a given message id.
   * Providing an empty branch id clears the selection.
   */
  setSelectedBranch: (messageId: string, branchId: string) => void;
  /** Remove stored selection for a message. */
  clearSelectedBranch: (messageId: string) => void;
  /** Lookup helper for non-reactive access. */
  getSelectedBranch: (messageId: string) => string | undefined;
  /** Reset all tracked selections. */
  reset: () => void;
}

export const useAIBranchesStore = create<BranchSelectionStoreState>((set, get) => ({
  selection: new Map<string, string>(),

  setSelectedBranch: (messageId, branchId) => {
    if (!messageId) return;

    set((state) => {
      const previous = state.selection.get(messageId);
      if (previous === branchId) return {};

      const next = new Map(state.selection);
      if (branchId) {
        next.set(messageId, branchId);
      } else {
        next.delete(messageId);
      }

      return { selection: next };
    });
  },

  clearSelectedBranch: (messageId) => {
    if (!messageId) return;
    set((state) => {
      if (!state.selection.has(messageId)) return {};
      const next = new Map(state.selection);
      next.delete(messageId);
      return { selection: next };
    });
  },

  getSelectedBranch: (messageId) => {
    if (!messageId) return undefined;
    return get().selection.get(messageId);
  },

  reset: () => {
    set({ selection: new Map<string, string>() });
  },
}));
