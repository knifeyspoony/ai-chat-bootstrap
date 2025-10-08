"use client";

import { useState } from "react";
import { useChatThreadsStore } from "ai-chat-bootstrap";

/**
 * Demo-only helper that disables thread persistence so each page load
 * starts with a fresh in-memory chat thread.
 */
export function useEphemeralChatThreads() {
  useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const store = useChatThreadsStore.getState();

    // Disable persistence to keep demo runs stateless.
    store.initializeEphemeral?.();

    return true;
  });
}
