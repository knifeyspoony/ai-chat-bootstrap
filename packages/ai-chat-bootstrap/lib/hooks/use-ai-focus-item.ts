import { useEffect } from "react";
import { useAIFocusStore } from "../stores";
import type { FocusItem } from "../types/chat";

/**
 * Reactively manage a single focus item, similar to useAIContext but for curated focus.
 * Automatically updates the stored focus item when dependencies (the data object reference or the deps array) change,
 * and removes the focus item when the component unmounts.
 *
 * Provide a stable id and a data builder; optionally pass a deps array to control recalculation.
 */
export function useAIFocusItem(
  id: string,
  build: () => Omit<FocusItem, "id"> | null | undefined,
  deps: unknown[] = []
) {
  const setFocus = useAIFocusStore((s) => s.setFocus);
  const clearFocus = useAIFocusStore((s) => s.clearFocus);

  useEffect(() => {
    const result = build();
    if (result) {
      setFocus(id, { id, ...result });
    } else {
      // Only clear if builder explicitly returns null/undefined
      clearFocus(id);
    }
    // NOTE: We intentionally do NOT auto-clear on unmount so that navigating
    // away (e.g. list -> editor) does not implicitly drop focus. Callers can
    // return null from build() or call clearFocus manually when desired.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, setFocus, clearFocus, ...deps]);
}
