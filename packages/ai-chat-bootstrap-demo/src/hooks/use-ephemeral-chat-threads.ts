"use client";

import { useEffect } from "react";
import { useChatThreadsStore } from "ai-chat-bootstrap";

/**
 * Demo-only helper that disables thread persistence so each page load
 * starts with a fresh in-memory chat thread.
 */
export function useEphemeralChatThreads() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const store = useChatThreadsStore.getState();
    store.initializeEphemeral?.();
  }, []);
}
