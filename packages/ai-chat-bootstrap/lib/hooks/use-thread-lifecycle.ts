import { useEffect, useState, useCallback, useRef } from "react";
import type { UIMessage } from "ai";
import { useChatThreadsStore } from "../stores";
import { normalizeMessagesMetadata } from "../utils/message-normalization";
import { logDevError } from "../utils/dev-logger";

type ChatHelpers = {
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;
};

const hasAutoTitledFlag = (metadata?: Record<string, unknown>): boolean => {
  if (!metadata) return false;
  const flag = (metadata as { autoTitled?: unknown }).autoTitled;
  return flag === true;
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
  chatHook: ChatHelpers;
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
  chatHook,
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

  const threadTitleEnabled =
    titleOptions?.enabled ?? Boolean(titleOptions?.api);
  const threadTitleApi =
    threadTitleEnabled && titleOptions?.api ? titleOptions.api : "";
  const threadTitleSampleCount = titleOptions?.sampleCount ?? 8;

  // Configure persistence mode based on threads enabled flag
  useEffect(() => {
    try {
      const store = threadStore.getState();

      if (!threadsEnabled) {
        if (store.mode !== "ephemeral") {
          store.initializeEphemeral?.();
        } else if (store.persistence) {
          store.setPersistence?.(undefined);
        }
        return;
      }

      if (store.mode !== "persistent" || !store.persistence) {
        store.initializePersistent?.();
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
        const state = threadStore.getState();

        if (!state.isSummariesLoaded) {
          try {
            await state.loadSummaries(scope);
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
        const activeId = state.activeThreadId;
        if (activeId) {
          const existingTimeline = state.getTimeline(activeId);
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
          const timeline = await state.ensureTimeline(activeId);
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

        const summaries = state.listSummaries(scope);
        if (summaries.length > 0) {
          startRestoring();
          const latest = summaries[0];
          state.setActiveThread(latest.id);
          const timeline =
            state.getTimeline(latest.id) ||
            (await state.ensureTimeline(latest.id));
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

        if (!state.activeThreadId) {
          const record = state.createThread({ scopeKey: scope });
          state.setActiveThread(record.id);
          const currentMessages = chatHookRef.current?.messages ?? [];
          if (currentMessages.length > 0) {
            state.updateThreadMessages(
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
  }, [threadId, autoCreate, warnOnMissing, scopeKey, threadStore, showErrorMessages, updateIsRestoringThread, initialMessages]);

  // Thread switching logic
  const lastThreadIdRef = useRef<string | undefined>(undefined);
  const isSyncingThreadRef = useRef(false);
  const lastSavedSignatureRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!threadStore) return;
    const effectiveId = threadId ?? storeActiveThreadId;
    if (effectiveId === lastThreadIdRef.current) return;

    if (isSyncingThreadRef.current) {
      if (showErrorMessages) {
        console.warn(
          "[acb][useThreadLifecycle] Skipping thread switch - already syncing"
        );
      }
      return;
    }

    isSyncingThreadRef.current = true;
    const prev = lastThreadIdRef.current;

    // Reset signature tracking when switching threads
    if (prev && prev !== effectiveId) {
      lastSavedSignatureRef.current = undefined;
    }

    if (showErrorMessages) {
      console.log(
        `[acb][useThreadLifecycle] Thread switch: ${prev?.slice(0, 8)} → ${effectiveId?.slice(0, 8)}`
      );
      console.log(
        `  Current chatHook.messages.length=${chatHookRef.current?.messages?.length ?? 0}`
      );
    }

    // Unload previous thread
    if (prev) {
      try {
        const st = threadStore.getState();
        st.unloadTimeline(prev);
      } catch (error) {
        logDevError(
          `[acb][useThreadLifecycle] failed to unload thread "${prev}"`,
          error,
          showErrorMessages
        );
      }
    }

    if (effectiveId) {
      try {
        const st = threadStore.getState();
        const existingTimeline = st.getTimeline(effectiveId);
        if (!existingTimeline) {
          st.ensureTimeline(effectiveId)
            .then((timeline) => {
              if (lastThreadIdRef.current !== effectiveId) {
                if (showErrorMessages) {
                  console.log(
                    `[acb][useThreadLifecycle] Skipping load - thread changed during async load`
                  );
                }
                isSyncingThreadRef.current = false;
                return;
              }
              if (!timeline) {
                if (showErrorMessages) {
                  console.log(
                    `[acb][useThreadLifecycle] No timeline from ensureTimeline - new thread with no messages`
                  );
                }
                const latest = chatHookRef.current;
                if (latest && latest.messages.length > 0) {
                  if (showErrorMessages) {
                    console.log(
                      `[acb][useThreadLifecycle] Clearing ${latest.messages.length} messages for new thread`
                    );
                  }
                  latest.setMessages([]);
                }
                lastThreadIdRef.current = effectiveId;
                isSyncingThreadRef.current = false;
                return;
              }
              const storeMsgs = timeline.messages as UIMessage[];
              const latest = chatHookRef.current;
              if (!latest) {
                isSyncingThreadRef.current = false;
                return;
              }
              const existing = latest.messages;
              const differs =
                existing.length !== storeMsgs.length ||
                existing.some((m, i) => storeMsgs[i]?.id !== m.id);
              if (differs) {
                if (showErrorMessages) {
                  console.log(
                    `[acb][useThreadLifecycle] Loading ${storeMsgs.length} messages for thread ${effectiveId?.slice(0, 8)}`
                  );
                }
                latest.setMessages(storeMsgs);
              } else {
                if (showErrorMessages) {
                  console.log(
                    `[acb][useThreadLifecycle] Messages already match (${existing.length} msgs)`
                  );
                }
              }
              lastThreadIdRef.current = effectiveId;
              isSyncingThreadRef.current = false;
            })
            .catch((error) => {
              logDevError(
                `[acb][useThreadLifecycle] failed to hydrate thread "${effectiveId}"`,
                error,
                showErrorMessages
              );
              isSyncingThreadRef.current = false;
            });
        } else {
          const storeMsgs = existingTimeline.messages as UIMessage[];
          const latest = chatHookRef.current;
          if (!latest) {
            isSyncingThreadRef.current = false;
            return;
          }
          const existing = latest.messages;
          const differs =
            existing.length !== storeMsgs.length ||
            existing.some((m, i) => storeMsgs[i]?.id !== m.id);
          if (differs) {
            if (showErrorMessages) {
              console.log(
                `[acb][useThreadLifecycle] Loading ${storeMsgs.length} messages for thread ${effectiveId?.slice(0, 8)}`
              );
            }
            latest.setMessages(storeMsgs);
          } else {
            if (showErrorMessages) {
              console.log(
                `[acb][useThreadLifecycle] Messages already match (${existing.length} msgs)`
              );
            }
          }
          lastThreadIdRef.current = effectiveId;
          isSyncingThreadRef.current = false;
        }
      } catch (error) {
        logDevError(
          `[acb][useThreadLifecycle] failed to access thread state for "${effectiveId}"`,
          error,
          showErrorMessages
        );
        isSyncingThreadRef.current = false;
      }
    } else {
      const latest = chatHookRef.current;
      if (latest && latest.messages.length > 0) {
        if (showErrorMessages) {
          console.log(
            `[acb][useThreadLifecycle] Clearing messages - no active thread`
          );
        }
        latest.setMessages([]);
      }
      isSyncingThreadRef.current = false;
    }
  }, [threadId, storeActiveThreadId, threadStore, showErrorMessages]);

  // Message persistence with deduplication
  function computeSignature(msgs: UIMessage[]): string {
    const tailIds = msgs
      .slice(-5)
      .map((m) => m.id)
      .join("|");
    return `${msgs.length}:${tailIds}`;
  }

  const persistMessagesIfChanged = useCallback(
    (reason?: string) => {
      const effectiveId =
        threadId ??
        (() => {
          try {
            return threadStore.getState().activeThreadId;
          } catch (error) {
            logDevError(
              "[acb][useThreadLifecycle] failed to read active thread id during persistence",
              error,
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
      } catch (error) {
        logDevError(
          `[acb][useThreadLifecycle] failed to persist messages for thread "${effectiveId}"`,
          error,
          showErrorMessages
        );
      }
    },
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
