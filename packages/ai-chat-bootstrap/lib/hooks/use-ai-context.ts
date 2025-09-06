import { useEffect } from "react";
import { useAIContextStore } from "../stores";
import type { ContextItem } from "../types/chat";

/**
 * Share application state with the AI chat context without causing re-renders.
 *
 * @param key - Unique identifier for the context value
 * @param value - The value to share with the AI
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const user = useCurrentUser()
 *
 *   // This won't re-render the chat interface
 *   useAIContext('currentUser', user)
 * }
 * ```
 */
export function useAIContext(
  id: string,
  data: Record<string, unknown>,
  opts?: {
    label?: string;
    description?: string;
    scope?: ContextItem["scope"];
    priority?: number;
  }
) {
  const setContextItem = useAIContextStore((state) => state.setContextItem);
  const removeContextItem = useAIContextStore(
    (state) => state.removeContextItem
  );

  useEffect(() => {
    setContextItem({
      id,
      data,
      label: opts?.label,
      description: opts?.description,
      scope: opts?.scope,
      priority: opts?.priority,
    });
    return () => {
      removeContextItem(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, data, opts?.label, opts?.description, opts?.scope, opts?.priority]);
}
