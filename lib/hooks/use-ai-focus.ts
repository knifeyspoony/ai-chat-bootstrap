import { useAIFocusStore } from '@lib/stores'
import { useShallow } from 'zustand/react/shallow'

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
 *     // Add note to focus
 *     setFocus(noteId, {
 *       id: noteId,
 *       type: 'note',
 *       title: noteData.title,
 *       content: noteData.content
 *     })
 *   }
 *   
 *   const handleNoteDeselect = (noteId: string) => {
 *     // Remove note from focus
 *     clearFocus(noteId)
 *   }
 *   
 *   // These are reactive - only re-render when focus state changes
 *   console.log('Focused IDs:', focusedIds) // ['note-123', 'note-456']
 *   console.log('Focus items:', allFocusItems) // [{ id: 'note-123', type: 'note', ... }, ...]
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
    getFocus
  } = useAIFocusStore(useShallow(state => ({
    focusItems: state.focusItems,
    setFocus: state.setFocus,
    clearFocus: state.clearFocus,
    clearAllFocus: state.clearAllFocus,
    getFocus: state.getFocus
  })))
  
  // Derive computed values from the stable Map reference (no additional hooks)
  const focusedIds = Array.from(focusItemsMap.keys())
  const allFocusItems = Array.from(focusItemsMap.values())
  const hasFocusedItems = focusItemsMap.size > 0
  const focusItemsRecord = Object.fromEntries(focusItemsMap.entries())
  
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
    serialize: () => focusItemsRecord
  }
}