import { useEffect } from "react";
import { useAIContextStore } from "../stores";
import type { ContextItem } from "../types/chat";

// Dev-time guard to detect un-memoized context data objects causing effect churn / render loops.
// Intentionally lightweight: inspects up to the first 12 enumerable keys and builds a shallow hash.
// If the object reference keeps changing while the shallow hash remains identical for several consecutive
// renders, we assume the caller forgot to memoize the object (e.g. useMemo) and throw in development.
const __acbContextIdentityGuard: Map<
  string,
  {
    lastRef: unknown;
    lastHash: string;
    churn: number;
  }
> = new Map();

function devGuardContextIdentity(id: string, data: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production" || data == null) return;
  // Only objects/arrays (already typed as Record<string, unknown>)
  const keys = Object.keys(data).slice(0, 12).sort();
  let hash = "";
  for (const k of keys) {
    const v = (data as any)[k];
    const t = typeof v;
    if (t === "string" || t === "number" || t === "boolean") {
      hash += `${k}:${t}:${String(v).slice(0, 40)}|`;
    } else {
      hash += `${k}:${t}|`;
    }
  }
  const entry = __acbContextIdentityGuard.get(id) || {
    lastRef: null,
    lastHash: "",
    churn: 0,
  };
  if (entry.lastRef !== data && entry.lastHash === hash) {
    entry.churn += 1;
  } else if (entry.lastHash !== hash) {
    // Semantic change resets churn
    entry.churn = 0;
  }
  entry.lastRef = data;
  entry.lastHash = hash;
  __acbContextIdentityGuard.set(id, entry);

  // Threshold: 10 consecutive identity changes with identical shallow hash
  if (entry.churn > 10) {
    throw new Error(
      `[ai-chat-bootstrap] Detected non-memoized context data for id="${id}". ` +
        `The object identity changes every render without semantic changes. ` +
        `Wrap the data object in useMemo: useMemo(() => ({ ... }), [deps]).`
    );
  }
}

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
  // Dev guard – will throw early if un-memoized object reference churn is detected.
  devGuardContextIdentity(id, data);
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
