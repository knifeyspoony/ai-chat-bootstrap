import { create } from "zustand";

export interface BranchSelectionStoreState {
  /**
   * Maps assistant message ids to the branch id currently selected in the UI.
   * The branch id corresponds to the `UIMessage.id` of the rendered variant.
   */
  selection: Map<string, string>;
  /**
   * Tracks the most recently selected branch index for each assistant message.
   * This is used to preserve UI focus when the underlying branch ids change
   * (for example, after promoting a branch to canonical).
   */
  selectionIndex: Map<string, number>;
  /**
   * Replace the stored branch selection for a given message id.
   * Providing an empty branch id clears the selection.
   */
  setSelectedBranch: (
    messageId: string,
    branchId: string,
    branchIndex?: number
  ) => void;
  /** Remove stored selection for a message. */
  clearSelectedBranch: (messageId: string) => void;
  /** Lookup helper for non-reactive access. */
  getSelectedBranch: (messageId: string) => string | undefined;
  /** Retrieve the stored branch index for a message, if available. */
  getSelectedBranchIndex: (messageId: string) => number | undefined;
  /** Reset all tracked selections. */
  reset: () => void;
}

export const useAIBranchesStore = create<BranchSelectionStoreState>((set, get) => ({
  selection: new Map<string, string>(),
  selectionIndex: new Map<string, number>(),

  setSelectedBranch: (messageId, branchId, branchIndex) => {
    if (!messageId) return;

    set((state) => {
      let selection: Map<string, string> | undefined;
      let selectionIndex: Map<string, number> | undefined;

      const previous = state.selection.get(messageId);
      if (previous !== branchId) {
        const next = new Map(state.selection);
        if (branchId) {
          next.set(messageId, branchId);
        } else {
          next.delete(messageId);
        }
        selection = next;
      }

      const hasIndex =
        typeof branchIndex === "number" && Number.isFinite(branchIndex);

      if (!branchId) {
        if (state.selectionIndex.has(messageId)) {
          const next = new Map(state.selectionIndex);
          next.delete(messageId);
          selectionIndex = next;
        }
      } else if (hasIndex) {
        const normalizedIndex = Math.max(0, Math.trunc(branchIndex));
        const previousIndex = state.selectionIndex.get(messageId);
        if (previousIndex !== normalizedIndex) {
          const next = new Map(state.selectionIndex);
          next.set(messageId, normalizedIndex);
          selectionIndex = next;
        }
      }

      if (!selection && !selectionIndex) {
        return {};
      }

      return {
        ...(selection ? { selection } : {}),
        ...(selectionIndex ? { selectionIndex } : {}),
      };
    });
  },

  clearSelectedBranch: (messageId) => {
    if (!messageId) return;
    set((state) => {
      const hasSelection = state.selection.has(messageId);
      const hasIndex = state.selectionIndex.has(messageId);

      if (!hasSelection && !hasIndex) {
        return {};
      }

      const nextSelection = hasSelection
        ? (() => {
            const next = new Map(state.selection);
            next.delete(messageId);
            return next;
          })()
        : undefined;

      const nextIndex = hasIndex
        ? (() => {
            const next = new Map(state.selectionIndex);
            next.delete(messageId);
            return next;
          })()
        : undefined;

      return {
        ...(nextSelection ? { selection: nextSelection } : {}),
        ...(nextIndex ? { selectionIndex: nextIndex } : {}),
      };
    });
  },

  getSelectedBranch: (messageId) => {
    if (!messageId) return undefined;
    return get().selection.get(messageId);
  },

  getSelectedBranchIndex: (messageId) => {
    if (!messageId) return undefined;
    return get().selectionIndex.get(messageId);
  },

  reset: () => {
    set({
      selection: new Map<string, string>(),
      selectionIndex: new Map<string, number>(),
    });
  },
}));
