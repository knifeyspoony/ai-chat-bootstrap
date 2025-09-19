import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAIFocusStore } from "../stores";

/**
 * Hook for managing focus items.
 * Focus items are serializable data objects that indicate which items are currently relevant to the AI conversation.
 *
 * @example
 * ```tsx
 * function NotesApp() {
 *   const { setFocus, clearFocus, focusedIds, allFocusItems, getFocus } = useAIFocus()
 *
 *   const handleNoteSelect = (noteId: string, noteData: any) => {
 *     // Add note to focus (explicit label + data payload)
 *     setFocus(noteId, {
 *       id: noteId,
 *       label: noteData.title || `Note ${noteId}`,
 *       data: {
 *         type: 'note',
 *         title: noteData.title,
 *         content: noteData.content
 *       }
 *     })
 *   }
 *
 *   const handleNoteDeselect = (noteId: string) => {
 *     // Remove note from focus
 *     clearFocus(noteId)
 *   }
 * }
 * ```
 */
export function useAIFocus() {
  // SINGLE Zustand call - get everything at once to minimize hook count
  const {
    focusItems: focusItemsMap,
    setFocus,
    clearFocus,
    clearAllFocus,
    getFocus,
  } = useAIFocusStore(
    useShallow((state) => ({
      focusItems: state.focusItems,
      setFocus: state.setFocus,
      clearFocus: state.clearFocus,
      clearAllFocus: state.clearAllFocus,
      getFocus: state.getFocus,
    }))
  );

  // Memoize derived values to prevent unnecessary re-renders
  const focusedIds = useMemo(() => Array.from(focusItemsMap.keys()), [focusItemsMap]);
  const allFocusItems = useMemo(() => Array.from(focusItemsMap.values()), [focusItemsMap]);
  const hasFocusedItems = focusItemsMap.size > 0;
  const focusItemsRecord = useMemo(() => Object.fromEntries(focusItemsMap.entries()), [focusItemsMap]);

  return {
    // Actions
    setFocus,
    clearFocus,
    clearAllFocus,
    getFocus,

    // Reactive state (preferred for render-time access)
    focusedIds,
    allFocusItems,
    hasFocusedItems,
    focusItemsRecord,

    // Legacy aliases for backward compatibility
    getFocusedIds: () => focusedIds,
    getAllFocusItems: () => allFocusItems,
    serialize: () => focusItemsRecord,
  };
}
