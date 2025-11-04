import { useEffect, useState, useCallback, useRef } from "react";
import type { UIMessage } from "ai";
import { useChatThreadsStore, useChatStore } from "../stores";
import { normalizeMessagesMetadata } from "../utils/message-normalization";
import { logDevError } from "../utils/dev-logger";
import { getDefaultChatThreadPersistence } from "../persistence/chat-threads-indexeddb";

type ChatHelpers = {
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;
  stop?: () => void;
  clearError?: () => void;
};

export interface ThreadTitleOptions {
  enabled?: boolean;
  api?: string;
  sampleCount?: number;
}

export interface UseThreadLifecycleOptions {
  threadsEnabled: boolean;
  threadId?: string;
  scopeKey?: string;
  autoCreate: boolean;
  warnOnMissing: boolean;
  titleOptions?: ThreadTitleOptions;
  initialMessages?: UIMessage[];
  chatHook?: ChatHelpers;
  chatHookRef: React.MutableRefObject<ChatHelpers | null>;
  showErrorMessages?: boolean;
}

/**
 * Hook to manage thread lifecycle including:
 * - Thread mode configuration (persistent/ephemeral)
 * - Thread selection/creation/switching logic
 * - Message persistence with deduplication
 * - Thread title generation (preview + AI-enhanced)
 */
export function useThreadLifecycle({
  threadsEnabled,
  threadId,
  scopeKey,
  autoCreate,
  warnOnMissing,
  titleOptions,
  initialMessages,
  chatHookRef,
  showErrorMessages = false,
}: UseThreadLifecycleOptions) {
  const threadStore = useChatThreadsStore;
  const storeActiveThreadId = useChatThreadsStore(
    (state) => state.activeThreadId
  );

  const [isRestoringThread, setIsRestoringThread] = useState(false);
  const updateIsRestoringThread = useCallback((next: boolean) => {
    setIsRestoringThread((prev) => (prev === next ? prev : next));
  }, []);
  const missingPersistenceLoggedRef = useRef(false);

  const threadTitleEnabled =
    titleOptions?.enabled ?? Boolean(titleOptions?.api);
  const threadTitleApi =
    threadTitleEnabled && titleOptions?.api ? titleOptions.api : "";
  const threadTitleSampleCount = titleOptions?.sampleCount ?? 8;
  const lastFreshThreadResetRef = useRef<string | undefined>(undefined);

  const resetChatForFreshThread = useCallback(
    (threadIdentifier: string) => {
      // Clear global chat error state first so UI reflects reset even if chat hook is unavailable
      try {
        useChatStore.getState().setError(null);
      } catch (error) {
        logDevError(
          `[acb][useThreadLifecycle] failed to reset global chat error for new thread "${threadIdentifier}"`,
          error,
          showErrorMessages
        );
      }

      const latest = chatHookRef.current;
      if (!latest) return;

      try {
        if (typeof latest.stop === "function") {
          latest.stop();
        }
      } catch (error) {
        logDevError(
          `[acb][useThreadLifecycle] failed to cancel active completion for new thread "${threadIdentifier}"`,
          error,
          showErrorMessages
        );
      }

      try {
        if (typeof latest.clearError === "function") {
          latest.clearError();
        }
      } catch (error) {
        logDevError(
          `[acb][useThreadLifecycle] failed to clear chat hook error for new thread "${threadIdentifier}"`,
          error,
          showErrorMessages
        );
      }

      try {
        if (Array.isArray(latest.messages) && latest.messages.length > 0) {
          latest.setMessages([]);
        }
      } catch (error) {
        logDevError(
          `[acb][useThreadLifecycle] failed to clear messages for new thread "${threadIdentifier}"`,
          error,
          showErrorMessages
        );
      }
    },
    [chatHookRef, showErrorMessages]
  );

  // Configure persistence mode based on threads enabled flag
  useEffect(() => {
    try {
      const store = threadStore.getState();

      if (!threadsEnabled) {
        missingPersistenceLoggedRef.current = false;
        if (store.mode !== "ephemeral") {
          store.initializeEphemeral?.();
        } else if (store.persistence) {
          store.setPersistence?.(undefined);
        }
        return;
      }

      if (store.persistence) {
        missingPersistenceLoggedRef.current = false;
        if (store.mode !== "persistent") {
          store.setPersistence?.(store.persistence);
        }
        return;
      }

      const adapter = getDefaultChatThreadPersistence();
      if (adapter) {
        missingPersistenceLoggedRef.current = false;
        store.initializePersistent?.(adapter);
        return;
      }

      if (!missingPersistenceLoggedRef.current) {
        missingPersistenceLoggedRef.current = true;
        const message =
          "[acb][useThreadLifecycle] threadsEnabled is true but no persistence adapter is available; falling back to ephemeral mode.";
        console.error(message);
        logDevError(
          "[acb][useThreadLifecycle] missing persistence adapter",
          new Error(message),
          showErrorMessages
        );
      }

      if (store.mode !== "ephemeral") {
        store.initializeEphemeral?.();
      }
    } catch (error) {
      logDevError(
        "[acb][useThreadLifecycle] failed to configure chat thread persistence mode",
        error,
        showErrorMessages
      );
    }
  }, [threadStore, threadsEnabled, showErrorMessages]);

  // Apply scopeKey and load threads for that scope
  useEffect(() => {
    if (!scopeKey) return;
    try {
      const state = threadStore.getState();
      const scopeChanged = state.scopeKey !== scopeKey;
      if (scopeChanged) {
        state.setScopeKey(scopeKey);
      }
      if (!state.isSummariesLoaded || scopeChanged) {
        state.loadSummaries(scopeKey).catch((error) => {
          logDevError(
            `[acb][useThreadLifecycle] failed to load thread summaries for scope "${scopeKey}"`,
            error,
            showErrorMessages
          );
        });
      }
    } catch (error) {
      logDevError(
        "[acb][useThreadLifecycle] failed to resolve thread scope metadata",
        error,
        showErrorMessages
      );
    }
  }, [scopeKey, threadStore, showErrorMessages]);

  // When no threadId provided, choose most recently updated or create new
  useEffect(() => {
    if (threadId) return;
    let cancelled = false;

    const scope = scopeKey;

    async function pickOrCreateLatest() {
      let started = false;
      const startRestoring = () => {
        if (cancelled || started) return;
        started = true;
        updateIsRestoringThread(true);
      };
      const stopRestoring = () => {
        if (!started) return;
        started = false;
        if (!cancelled) {
          updateIsRestoringThread(false);
        }
      };

      try {
        let state = threadStore.getState();

        if (!state.isSummariesLoaded) {
          try {
            await state.loadSummaries(scope);
            state = threadStore.getState();
          } catch (error) {
            logDevError(
              `[acb][useThreadLifecycle] failed to load thread summaries before selecting default thread (scope "${
                scope ?? "(default)"
              }")`,
              error,
              showErrorMessages
            );
          }
        }

        // Prefer existing active if present
        let activeId = state.activeThreadId;
        if (activeId) {
          const existingTimeline = threadStore.getState().getTimeline(activeId);
          if (existingTimeline) {
            const storeMsgs = existingTimeline.messages as UIMessage[];
            const currentMessages = chatHookRef.current?.messages ?? [];
            const differs =
              currentMessages.length !== storeMsgs.length ||
              currentMessages.some((m, i) => storeMsgs[i]?.id !== m.id);
            if (differs) chatHookRef.current?.setMessages(storeMsgs);
            return;
          }

          startRestoring();
          const timeline = await threadStore.getState().ensureTimeline(activeId);
          if (timeline) {
            const storeMsgs = timeline.messages as UIMessage[];
            const currentMessages = chatHookRef.current?.messages ?? [];
            const differs =
              currentMessages.length !== storeMsgs.length ||
              currentMessages.some((m, i) => storeMsgs[i]?.id !== m.id);
            if (differs) chatHookRef.current?.setMessages(storeMsgs);
            return;
          }
          // If ensureTimeline failed to resolve, refresh state before falling back
          state = threadStore.getState();
          activeId = state.activeThreadId;
          if (activeId) {
            const existingAfterEnsure = state.getTimeline(activeId);
            if (existingAfterEnsure) {
              const storeMsgs = existingAfterEnsure.messages as UIMessage[];
              const currentMessages = chatHookRef.current?.messages ?? [];
              const differs =
                currentMessages.length !== storeMsgs.length ||
                currentMessages.some((m, i) => storeMsgs[i]?.id !== m.id);
              if (differs) chatHookRef.current?.setMessages(storeMsgs);
              return;
            }
          }
        }

        const summaries = threadStore.getState().listSummaries(scope);
        if (summaries.length > 0) {
          startRestoring();
          const latest = summaries[0];
          threadStore.getState().setActiveThread(latest.id);
          const refreshed = threadStore.getState();
          const timeline =
            refreshed.getTimeline(latest.id) ||
            (await refreshed.ensureTimeline(latest.id));
          if (timeline) {
            const storeMsgs = timeline.messages as UIMessage[];
            const currentMessages = chatHookRef.current?.messages ?? [];
            const differs =
              currentMessages.length !== storeMsgs.length ||
              currentMessages.some((m, i) => storeMsgs[i]?.id !== m.id);
            if (differs) chatHookRef.current?.setMessages(storeMsgs);
            return;
          }
        }

        const finalState = threadStore.getState();
        if (!finalState.activeThreadId) {
          const record = finalState.createThread({ scopeKey: scope });
          finalState.setActiveThread(record.id);
          const currentMessages = chatHookRef.current?.messages ?? [];
          if (currentMessages.length > 0) {
            finalState.updateThreadMessages(
              record.id,
              currentMessages
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          logDevError(
            "[acb][useThreadLifecycle] failed to select or create a default thread",
            error,
            showErrorMessages
          );
        }
      } finally {
        stopRestoring();
      }
    }

    pickOrCreateLatest();

    return () => {
      cancelled = true;
      updateIsRestoringThread(false);
    };
    // chatHookRef is intentionally not in deps - refs are stable and don't trigger re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, scopeKey, threadStore, showErrorMessages, updateIsRestoringThread]);

  // Load initial thread messages synchronously if already present
  const existingThreadMessages: UIMessage[] | undefined = (() => {
    const effectiveId =
      threadId ??
      (() => {
        try {
          return useChatThreadsStore.getState().activeThreadId;
        } catch (error) {
          logDevError(
            "[acb][useThreadLifecycle] failed to read active thread id from store",
            error,
            showErrorMessages
          );
          return undefined;
        }
      })();
    if (effectiveId) {
      try {
        const state = useChatThreadsStore.getState();
        const timeline = state.getTimeline(effectiveId);
        return timeline?.messages;
      } catch (error) {
        logDevError(
          `[acb][useThreadLifecycle] failed to read cached messages for thread "${effectiveId}"`,
          error,
          showErrorMessages
        );
        return undefined;
      }
    }
    return undefined;
  })();

  // If threadId provided but not in memory, load from persistence
  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    try {
      const state = threadStore.getState();
      if (state.getTimeline(threadId)) {
        updateIsRestoringThread(false);
        return;
      }

      updateIsRestoringThread(true);

      state
        .ensureTimeline(threadId)
        .then((timeline) => {
          if (cancelled) return;
          if (timeline) {
            const storeMsgs = timeline.messages as UIMessage[];
            const currentMessages = chatHookRef.current?.messages ?? [];
            const differs =
              currentMessages.length !== storeMsgs.length ||
              currentMessages.some((m, i) => storeMsgs[i]?.id !== m.id);
            if (differs) chatHookRef.current?.setMessages(storeMsgs);
            if (state.activeThreadId !== threadId) {
              state.setActiveThread(threadId);
            }
            return;
          }
          if (warnOnMissing) {
            console.warn(
              `[acb][useThreadLifecycle] threadId "${threadId}" not found; ${
                autoCreate ? "creating new thread" : "no auto-create"
              }`
            );
          }
          if (autoCreate) {
            state.createThread({ id: threadId, scopeKey });
            state.setActiveThread(threadId);
            if (initialMessages && initialMessages.length > 0) {
              state.updateThreadMessages(
                threadId,
                initialMessages as UIMessage[]
              );
            }
          }
        })
        .catch((error) => {
          if (cancelled) return;
          if (warnOnMissing) {
            console.warn(
              `[acb][useThreadLifecycle] failed loading threadId "${threadId}" from persistence`
            );
          }
          logDevError(
            `[acb][useThreadLifecycle] failed loading threadId "${threadId}" from persistence`,
            error,
            showErrorMessages
          );
          const s2 = threadStore.getState();
          if (autoCreate && !s2.getRecord(threadId)) {
            const record = s2.createThread({ id: threadId, scopeKey });
            s2.setActiveThread(record.id);
          }
        })
        .finally(() => {
          if (!cancelled) {
            updateIsRestoringThread(false);
          }
        });
    } catch (error) {
      updateIsRestoringThread(false);
      logDevError(
        `[acb][useThreadLifecycle] failed handling provided threadId "${threadId}"`,
        error,
        showErrorMessages
      );
    }

    return () => {
      cancelled = true;
      updateIsRestoringThread(false);
    };
    // chatHookRef is intentionally not in deps - refs are stable and don't trigger re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, autoCreate, warnOnMissing, scopeKey, threadStore, showErrorMessages, updateIsRestoringThread, initialMessages]);

  // Thread switching logic
  const lastThreadIdRef = useRef<string | undefined>(undefined);
  const isSyncingThreadRef = useRef(false);
  const lastSavedSignatureRef = useRef<string | undefined>(undefined);
  const pendingThreadResetRef = useRef(false);
  const threadSyncTokenRef = useRef(0);

  useEffect(() => {
    if (!threadStore) return;
    const effectiveId = threadId ?? storeActiveThreadId;
    const previousHydratedId = lastThreadIdRef.current;
    const token = ++threadSyncTokenRef.current;

    if (previousHydratedId && previousHydratedId !== effectiveId) {
      lastSavedSignatureRef.current = undefined;
    }

    const logDebug = (message: string) => {
      if (showErrorMessages) {
        console.log(message);
      }
    };

    const syncMessages = (messages: UIMessage[], pendingReset: boolean) => {
      if (threadSyncTokenRef.current !== token) return;
      updateIsRestoringThread(pendingReset);
      const latest = chatHookRef.current;
      if (latest) {
        const existing = latest.messages;
        const differs =
          existing.length !== messages.length ||
          existing.some((m, index) => messages[index]?.id !== m.id);
        if (differs) {
          logDebug(
            `[acb][useThreadLifecycle] Rendering ${messages.length} message(s) for thread ${effectiveId?.slice(0, 8)}`
          );
          latest.setMessages(messages);
        }
      }
      lastThreadIdRef.current = effectiveId;
      pendingThreadResetRef.current = pendingReset;
    };

    const finishSync = () => {
      if (threadSyncTokenRef.current === token) {
        isSyncingThreadRef.current = false;
        updateIsRestoringThread(false);
      }
    };

    let state: ReturnType<typeof threadStore.getState>;
    try {
      state = threadStore.getState();
    } catch (error) {
      logDevError(
        "[acb][useThreadLifecycle] failed to access chat thread store",
        error,
        showErrorMessages
      );
      finishSync();
      return;
    }

    if (
      effectiveId &&
      lastFreshThreadResetRef.current !== effectiveId
    ) {
      try {
        const record = state.getRecord(effectiveId);
        const timeline = state.getTimeline(effectiveId);
        const createdAt = record?.createdAt ?? 0;
        const updatedAt = record?.updatedAt ?? 0;
        const hasRecord = Boolean(record);
        const messageCount = record?.messageCount ?? 0;
        const timelineMessages = (timeline?.messages ?? []) as UIMessage[];
        const timelineCount = timelineMessages.length;
        const isFreshThread =
          (!hasRecord && timelineCount === 0) ||
          (hasRecord && createdAt === updatedAt);

        if (isFreshThread) {
          resetChatForFreshThread(effectiveId);
          lastFreshThreadResetRef.current = effectiveId;
        }
      } catch (error) {
        logDevError(
          `[acb][useThreadLifecycle] failed to inspect thread "${effectiveId}" freshness`,
          error,
          showErrorMessages
        );
      }
    }

    if (previousHydratedId && previousHydratedId !== effectiveId) {
      try {
        state.unloadTimeline(previousHydratedId);
      } catch (error) {
        logDevError(
          `[acb][useThreadLifecycle] failed to unload thread "${previousHydratedId}"`,
          error,
          showErrorMessages
        );
      }
    }

    if (!effectiveId) {
      const latest = chatHookRef.current;
      if (latest && latest.messages.length > 0) {
        logDebug("[acb][useThreadLifecycle] Clearing messages - no active thread");
        latest.setMessages([]);
      }
      lastThreadIdRef.current = undefined;
      pendingThreadResetRef.current = false;
      finishSync();
      return;
    }

    updateIsRestoringThread(true);

    if (showErrorMessages) {
      logDebug(
        `[acb][useThreadLifecycle] Thread switch: ${previousHydratedId?.slice(0, 8)} → ${effectiveId.slice(0, 8)}`
      );
      logDebug(
        `  Current chatHook.messages.length=${chatHookRef.current?.messages?.length ?? 0}`
      );
    }

    const existingTimeline = state.getTimeline(effectiveId);
    if (existingTimeline) {
      const storeMessages = (existingTimeline.messages ?? []) as UIMessage[];
      syncMessages(storeMessages, false);
      finishSync();
      return;
    }

    isSyncingThreadRef.current = true;
    pendingThreadResetRef.current = true;

    // Immediately clear while hydrating to avoid showing the previous thread's messages
    syncMessages([], true);

    state
      .ensureTimeline(effectiveId)
      .then((timeline) => {
        if (threadSyncTokenRef.current !== token) return;
        if (!timeline) {
          logDebug(
            `[acb][useThreadLifecycle] No timeline from ensureTimeline for thread ${effectiveId.slice(0, 8)}`
          );
          syncMessages([], false);
          return;
        }
        const storeMessages = (timeline.messages ?? []) as UIMessage[];
        syncMessages(storeMessages, false);
      })
      .catch((error) => {
        if (threadSyncTokenRef.current !== token) return;
        logDevError(
          `[acb][useThreadLifecycle] failed to hydrate thread "${effectiveId}"`,
          error,
          showErrorMessages
        );
        syncMessages([], false);
      })
      .finally(() => {
        finishSync();
      });
    // chatHookRef is intentionally not in deps - refs are stable and don't trigger re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, storeActiveThreadId, threadStore, showErrorMessages, resetChatForFreshThread]);

  // Message persistence with deduplication
  function computeSignature(msgs: UIMessage[]): string {
    const tailIds = msgs
      .slice(-5)
      .map((m) => m.id)
      .join("|");
    return `${msgs.length}:${tailIds}`;
  }

  const persistMessagesIfChanged = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_reason?: string) => {
      const effectiveId =
        threadId ??
        (() => {
          try {
            return threadStore.getState().activeThreadId;
          } catch (_error) {
            logDevError(
              "[acb][useThreadLifecycle] failed to read active thread id during persistence",
              _error,
              showErrorMessages
            );
            return undefined;
          }
        })();

      if (!effectiveId) return;

      if (isSyncingThreadRef.current) return;

      if (
        lastThreadIdRef.current !== undefined &&
        effectiveId !== lastThreadIdRef.current
      ) {
        if (showErrorMessages) {
          console.warn(
            `[acb][useThreadLifecycle] Skipping persistence - thread mismatch`
          );
        }
        return;
      }

      if (lastThreadIdRef.current === undefined && effectiveId) {
        lastThreadIdRef.current = effectiveId;
      }

      try {
        const store = threadStore.getState();
        const timeline = store.getTimeline(effectiveId);
        const storeMessages = (timeline?.messages ?? []) as UIMessage[];
        const helper = chatHookRef.current;
        const candidateMessages = (helper?.messages ?? []) as UIMessage[];
        const existingRecord = store.getRecord(effectiveId);

        if (pendingThreadResetRef.current) {
          const canInspect =
            helper !== null &&
            helper !== undefined &&
            Array.isArray(candidateMessages);
          if (!canInspect) {
            // Without a chat instance we cannot safely persist; allow future attempts.
            return;
          }
          const inSync =
            storeMessages.length === candidateMessages.length &&
            storeMessages.every(
              (storeMessage, index) =>
                storeMessage?.id === candidateMessages[index]?.id
            );
          if (!inSync) {
            if (showErrorMessages) {
              console.log(
                "[acb][useThreadLifecycle] Skipping persistence while thread messages are syncing"
              );
            }
            return;
          }
          pendingThreadResetRef.current = false;
        }

        if (candidateMessages.length === 0 && storeMessages.length > 0) {
          if (showErrorMessages) {
            console.warn(
              "[acb][useThreadLifecycle] Skipping persistence: candidate empty but store has messages"
            );
          }
          return;
        }

        if (candidateMessages.length === 0 && storeMessages.length === 0) {
          if (existingRecord && existingRecord.messageCount > 0) {
            if (showErrorMessages) {
              console.warn(
                `[acb][useThreadLifecycle] Skipping persistence: both sources empty but record has ${existingRecord.messageCount} messages`
              );
            }
            return;
          }
        }

        const storeSignature = computeSignature(storeMessages);
        const candidateSignature = computeSignature(candidateMessages);

        let msgs: UIMessage[];
        let signature: string;

        if (candidateMessages.length > storeMessages.length) {
          msgs = candidateMessages;
          signature = candidateSignature;
        } else if (candidateMessages.length < storeMessages.length) {
          msgs = storeMessages;
          signature = storeSignature;
        } else if (candidateSignature !== storeSignature) {
          msgs = candidateMessages;
          signature = candidateSignature;
        } else {
          msgs = storeMessages;
          signature = storeSignature;
        }

        if (signature === lastSavedSignatureRef.current) {
          return;
        }

        store.updateThreadMessages(effectiveId, msgs);
        lastSavedSignatureRef.current = signature;
        pendingThreadResetRef.current = false;
      } catch (error) {
        logDevError(
          `[acb][useThreadLifecycle] failed to persist messages for thread "${effectiveId}"`,
          error,
          showErrorMessages
        );
      }
    },
    // chatHookRef is intentionally not in deps - refs are stable and don't trigger re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [threadId, threadStore, showErrorMessages]
  );

  // Auto-persist on idle
  useEffect(() => {
    const effectiveId = threadId ?? storeActiveThreadId;
    if (!effectiveId) return;
    // Note: caller should check status before calling
    persistMessagesIfChanged("idle");
  }, [threadId, storeActiveThreadId, persistMessagesIfChanged]);

  // Persist on unmount
  useEffect(() => {
    return () => {
      persistMessagesIfChanged("unmount");
    };
  }, [persistMessagesIfChanged]);

  // Title generation after message completion
  const generateThreadTitle = useCallback(
    (effectiveId: string, messagesSnapshot: UIMessage[]) => {
      if (!threadTitleEnabled || !threadTitleApi) return;

      try {
        const refreshedState = threadStore.getState();
        const currentRecord = refreshedState.getRecord(effectiveId);
        const meta = (currentRecord?.metadata || {}) as Record<
          string,
          unknown
        >;
        const manual = meta.manualTitle === true;

        if (manual) return;

        const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes
        const last =
          typeof meta.lastAutoTitleAt === "number"
            ? (meta.lastAutoTitleAt as number)
            : 0;
        const now = Date.now();
        if (now - last >= COOLDOWN_MS) {
          refreshedState.updateThreadMetadata?.(effectiveId, {
            lastAutoTitleAt: now,
          });

          const storeMsgs =
            refreshedState.getTimeline(effectiveId)?.messages ?? [];
          const source =
            storeMsgs.length > 0 ? storeMsgs : (messagesSnapshot as UIMessage[]) || [];
          const sample = source.slice(-threadTitleSampleCount);
          const payload: {
            messages: UIMessage[];
            previousTitle?: string;
          } = {
            messages: sample,
            previousTitle:
              typeof currentRecord?.title === "string"
                ? currentRecord.title
                : undefined,
          };
          fetch(threadTitleApi, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
            .then(async (r) => {
              if (!r.ok) return;
              const data: { title?: string } = await r.json();
              if (data.title) {
                refreshedState.renameThread(effectiveId, data.title, {
                  allowAutoReplace: true,
                });
              }
            })
            .catch((error) => {
              logDevError(
                `[acb][useThreadLifecycle] failed to fetch auto title for thread "${effectiveId}"`,
                error,
                showErrorMessages
              );
            });
        }
      } catch (error) {
        logDevError(
          `[acb][useThreadLifecycle] failed to apply auto-title logic for thread "${effectiveId}"`,
          error,
          showErrorMessages
        );
      }
    },
    [threadTitleEnabled, threadTitleApi, threadTitleSampleCount, threadStore, showErrorMessages]
  );

  // onFinish callback for integration with chat hook
  const onFinish = useCallback(
    (message: UIMessage, latestMessages: UIMessage[]) => {
      const { messages: normalizedMessages, changed: normalizedChanged } =
        normalizeMessagesMetadata(latestMessages, {
          shouldStampTimestamp: (candidate) =>
            candidate === message ||
            (!!message?.id && candidate.id === message.id),
          timestampFactory: () => Date.now(),
        });
      const messagesSnapshot = normalizedChanged
        ? normalizedMessages
        : latestMessages;

      if (normalizedChanged) {
        chatHookRef.current?.setMessages(normalizedMessages);
      }

      if (threadStore) {
        try {
          const state = threadStore.getState();
          const effectiveId = threadId ?? state.activeThreadId;
          if (effectiveId) {
            state.updateThreadMessages(effectiveId, messagesSnapshot);
            const record = state.getRecord(effectiveId);

            // Immediate default title after first user message
            if (record && !record.title) {
              const firstUserMessage = messagesSnapshot.find(
                (m) => m.role === "user"
              );
              const firstUserText = (firstUserMessage?.parts ?? [])
                .map((part) =>
                  part?.type === "text" ? String(part.text ?? "") : ""
                )
                .filter(Boolean)
                .join(" ")
                .trim();
              if (firstUserText) {
                const PREVIEW_LEN = 24;
                let preview = firstUserText.slice(0, PREVIEW_LEN);
                if (firstUserText.length > PREVIEW_LEN) {
                  const lastSpace = preview.lastIndexOf(" ");
                  if (lastSpace > 8) preview = preview.slice(0, lastSpace);
                }
                preview = preview
                  .replace(/[\n\r]+/g, " ")
                  .replace(/\s+/g, " ")
                  .trim();
                if (preview) {
                  const refreshedState = threadStore.getState();
                  refreshedState.renameThread(effectiveId, preview, {
                    allowAutoReplace: true,
                  });
                }
              }
            }

            // AI upgrade with cooldown
            generateThreadTitle(effectiveId, messagesSnapshot);
          }
        } catch (error) {
          logDevError(
            "[acb][useThreadLifecycle] failed to persist messages after completion",
            error,
            showErrorMessages
          );
        }
      }
    },
    // chatHookRef is intentionally not in deps - refs are stable and don't trigger re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [threadId, threadStore, generateThreadTitle, showErrorMessages]
  );

  return {
    existingThreadMessages,
    isRestoringThread,
    persistMessagesIfChanged,
    onFinish,
    lastThreadIdRef,
    isSyncingThreadRef,
  };
}
