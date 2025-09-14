import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  UIMessage,
} from "ai";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  useAIContextStore,
  useAIFocusStore,
  useAIToolsStore,
  useChatThreadsStore,
} from "../stores";
import { useChatStore } from "../stores/";
import { buildEnrichedSystemPrompt } from "../utils/prompt-utils";

/**
 * Enhanced chat hook that integrates with AI SDK and our Zustand stores.
 * Automatically includes context, focus, tools and sends an enrichedSystemPrompt.
 *
 * Enriched System Prompt Strategy:
 *  - Always generated on each request (fresh snapshot of context/focus/tools)
 *  - Can be overridden per-call by providing body.enrichedSystemPrompt when sending a message
 *  - Original consumer-provided systemPrompt becomes the "originalSystemPrompt" appended in the enrichment
 */
export function useAIChat(
  options: {
    api?: string;
    systemPrompt?: string;
    onToolCall?: (toolCall: unknown) => void;
    onFinish?: () => void;
    initialMessages?: UIMessage[];
    threadId?: string; // optional thread integration
    /** Optional scope partition key for sharding threads (e.g. notebook/document id). */
    scopeKey?: string;
    /**
     * Endpoint for AI title generation. Defaults to "/api/thread-title".
     * Set to a different path to customize, or set to an empty string to disable network-based titling.
     */
    threadTitleApi?: string;
    /**
     * Number of recent messages to include when asking the backend to generate/upgrade a title.
     * Defaults to 8 (last 8 messages).
     */
    threadTitleSampleCount?: number;
    /**
     * If a threadId is provided and no thread exists in the store (and cannot be loaded
     * from persistence), automatically create a new thread with that id.
     * Defaults to true.
     */
    autoCreateThread?: boolean;
    /**
     * Emit a console.warn() when a supplied threadId could not be found/loaded.
     * Defaults to false.
     */
    warnOnMissingThread?: boolean;
  } = {}
) {
  const {
    api = "/api/chat",
    systemPrompt,
    onToolCall,
    onFinish,
    initialMessages,
    threadId,
    scopeKey,
    threadTitleApi = "",
    threadTitleSampleCount = 8,
    autoCreateThread = true,
    warnOnMissingThread = false,
  } = options;

  // Get raw store data with stable selectors - these return the same reference when unchanged
  const contextItemsMap = useAIContextStore(
    useShallow((state) => state.contextItems)
  );
  const toolsMap = useAIToolsStore(useShallow((state) => state.tools));
  const focusItemsMap = useAIFocusStore(
    useShallow((state) => state.focusItems)
  );
  const executeTool = useAIToolsStore((state) => state.executeTool);
  const setError = useChatStore((state) => state.setError);
  const setActiveThread = useChatThreadsStore((state) => state.setActiveThread);
  const storeActiveThreadId = useChatThreadsStore(
    (state) => state.activeThreadId
  );

  // Direct reference to the zustand store object (not a hook call) for imperative ops
  const threadStore = useChatThreadsStore; // NOTE: used in effects below (getState())

  // Apply scopeKey (if provided) and load threads for that scope the first time or when scope changes.
  useEffect(() => {
    if (!scopeKey) return;
    try {
      const state = threadStore.getState();
      const scopeChanged = state.scopeKey !== scopeKey;
      if (scopeChanged) {
        state.setScopeKey(scopeKey);
        state.loadThreadMetas(scopeKey).catch(() => {});
      } else if (!state.isLoaded) {
        state.loadThreadMetas(scopeKey).catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }, [scopeKey, threadStore]);

  // When no threadId provided, choose most recently updated in scope or create a new one.
  useEffect(() => {
    if (threadId) return; // caller controls id
    try {
      const state = threadStore.getState();
      const scope = scopeKey;
      async function pickOrCreateLatest() {
        if (!state.isLoaded) {
          try {
            await state.loadThreadMetas(scope);
          } catch {
            /* ignore */
          }
        }
        // Prefer existing active if present
        if (state.activeThreadId) {
          const id = state.activeThreadId;
          const t =
            state.getThreadIfLoaded?.(id) || (await state.loadThread(id));
          if (t) {
            const storeMsgs = t.messages as UIMessage[];
            const differs =
              chatHook.messages.length !== storeMsgs.length ||
              chatHook.messages.some((m, i) => storeMsgs[i]?.id !== m.id);
            if (differs) chatHook.setMessages(storeMsgs);
            return;
          }
        }
        const metas = state.listThreads(scope);
        if (metas.length > 0) {
          const latest = metas[0]; // sorted by updatedAt desc in store
          state.setActiveThread(latest.id);
          const t =
            state.getThreadIfLoaded?.(latest.id) ||
            (await state.loadThread(latest.id));
          if (t) {
            const storeMsgs = t.messages as UIMessage[];
            const differs =
              chatHook.messages.length !== storeMsgs.length ||
              chatHook.messages.some((m, i) => storeMsgs[i]?.id !== m.id);
            if (differs) chatHook.setMessages(storeMsgs);
            return;
          }
        }
        // No threads exist: create one for this scope
        const created = state.createThread({ scopeKey: scope });
        state.setActiveThread(created.id);
        if (chatHook.messages.length > 0) {
          state.updateThreadMessages(
            created.id,
            chatHook.messages as UIMessage[]
          );
        }
      }
      pickOrCreateLatest();
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, scopeKey]);

  // Load initial thread messages synchronously if already present in memory
  const existingThreadMessages: UIMessage[] | undefined = (() => {
    const effectiveId =
      threadId ??
      (() => {
        try {
          return useChatThreadsStore.getState().activeThreadId;
        } catch {
          return undefined;
        }
      })();
    if (effectiveId) {
      try {
        const state = useChatThreadsStore.getState();
        const t = state.getThreadIfLoaded?.(effectiveId);
        return t?.messages;
      } catch {
        return undefined;
      }
    }
    return undefined;
  })();

  // If a threadId is provided but not yet in memory, attempt to load it from persistence.
  // If still missing, optionally create it (allowing pre-seeding a stable id from app state).
  React.useEffect(() => {
    if (!threadId) return; // only for controlled id
    try {
      const state = threadStore.getState();
      if (state.getThreadIfLoaded?.(threadId)) return; // already loaded
      // Attempt persistence load
      state
        .loadThread(threadId)
        .then((loaded) => {
          if (loaded) {
            // Set messages in hook if they differ (covers first mount where existingThreadMessages was undefined)
            const storeMsgs = loaded.messages as UIMessage[];
            const differs =
              chatHook.messages.length !== storeMsgs.length ||
              chatHook.messages.some((m, i) => storeMsgs[i]?.id !== m.id);
            if (differs) chatHook.setMessages(storeMsgs);
            // Also ensure active thread is this one if none selected
            if (state.activeThreadId !== threadId) {
              state.setActiveThread(threadId);
            }
            return;
          }
          // Not loaded
          if (warnOnMissingThread) {
            console.warn(
              `[acb][useAIChat] threadId "${threadId}" not found; ${
                autoCreateThread ? "creating new thread" : "no auto-create"
              }`
            );
          }
          if (autoCreateThread) {
            // create a thread with the supplied id (stable external id)
            state.createThread({ id: threadId, scopeKey });
            state.setActiveThread(threadId);
            // chatHook messages already reflect initialMessages (if any)
            if (initialMessages && initialMessages.length > 0) {
              state.updateThreadMessages(
                threadId,
                initialMessages as UIMessage[]
              );
            }
          }
        })
        .catch(() => {
          if (warnOnMissingThread) {
            console.warn(
              `[acb][useAIChat] failed loading threadId "${threadId}" from persistence`
            );
          }
          const s2 = threadStore.getState();
          if (autoCreateThread && !s2.threads.get(threadId)) {
            s2.createThread({ id: threadId, scopeKey });
            s2.setActiveThread(threadId);
          }
        });
    } catch {
      /* ignore */
    }
    // We intentionally exclude dependencies that would retrigger this unnecessarily
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, autoCreateThread, warnOnMissingThread, scopeKey]);

  // Get focus items - they're already serializable
  const focusItems = useMemo(() => {
    return Array.from(focusItemsMap.values());
  }, [focusItemsMap]);

  // Cache serialized data - only recompute when raw store data changes
  const context = useMemo(() => {
    // Provide already normalized list for any UI needs
    return Array.from(contextItemsMap.values());
  }, [contextItemsMap]);

  const tools = useMemo(() => {
    return Array.from(toolsMap.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters, // This will need to be converted to JSON Schema in the transport
    }));
  }, [toolsMap]);

  // Memoize available tools to avoid creating new array in return
  const availableTools = useMemo(() => {
    return Array.from(toolsMap.values());
  }, [toolsMap]);

  // Create transport with dynamic request preparation - only recreate when api/systemPrompt changes
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api,
      prepareSendMessagesRequest: async (options) => {
        // Get fresh store data for each request - called only when sending messages
        const currentContext = await useAIContextStore.getState().serialize();
        const currentTools = useAIToolsStore
          .getState()
          .serializeToolsForBackend();
        const currentFocusItems = useAIFocusStore.getState().getAllFocusItems();
        const callerBody = options.body ?? {};

        // Per-call overrides
        const overrideTools = (callerBody as any).tools as
          | unknown[]
          | undefined;
        const overrideSystemPrompt = (callerBody as any).systemPrompt as
          | string
          | undefined;
        const overrideEnrichedSystemPrompt = (callerBody as any)
          .enrichedSystemPrompt as string | undefined;

        const toolsToSend = overrideTools ?? currentTools;
        const systemPromptToSend = overrideSystemPrompt ?? systemPrompt;

        // Build enriched system prompt unless explicitly supplied
        const enrichedSystemPromptToSend =
          overrideEnrichedSystemPrompt ??
          buildEnrichedSystemPrompt({
            originalSystemPrompt: systemPromptToSend,
            context: currentContext,
            focus: currentFocusItems,
            tools: toolsToSend.map((t: any) => ({
              name: t.name,
              description: t.description,
            })),
          });

        return {
          ...options,
          body: {
            ...callerBody,
            messages: options.messages,
            context: currentContext,
            tools: toolsToSend,
            focus: currentFocusItems, // Send complete focus items
            systemPrompt: systemPromptToSend,
            enrichedSystemPrompt: enrichedSystemPromptToSend,
          },
        };
      },
    });
  }, [api, systemPrompt]);

  const [draftInput, setDraftInput] = useState("");

  const chatHook = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    messages: existingThreadMessages ?? initialMessages,
    onToolCall: async ({ toolCall }) => {
      try {
        // Execute frontend tool if available
        const result = await executeTool(toolCall.toolName, toolCall.input);
        onToolCall?.(toolCall);
        // Add the tool result to the chat stream and still return it
        addToolResultForCall(toolCall, result);
      } catch (error) {
        setError("Tool execution failed");
        throw error;
      }
    },
    onFinish: () => {
      // Hook handles loading state internally
      onFinish?.();
      // Persist updated messages into thread (if any)
      if (threadStore) {
        try {
          const state = threadStore.getState();
          const effectiveId = threadId ?? state.activeThreadId;
          if (effectiveId && state.threads.get(effectiveId)) {
            state.updateThreadMessages(
              effectiveId,
              chatHook.messages as UIMessage[]
            );
            // Immediate default title after first user message (if no manual title)
            const tNow = state.threads.get(effectiveId);
            if (tNow && !tNow.title) {
              const firstUserText = (
                chatHook.messages.find((m) => m.role === "user")?.parts || []
              )
                .map((p: any) =>
                  p?.type === "text" ? String(p.text || "") : ""
                )
                .filter(Boolean)
                .join(" ")
                .trim();
              if (firstUserText) {
                const PREVIEW_LEN = 24; // keep in sync with UI truncation
                let preview = firstUserText.slice(0, PREVIEW_LEN);
                if (firstUserText.length > PREVIEW_LEN) {
                  // avoid cutting mid-word if possible
                  const lastSpace = preview.lastIndexOf(" ");
                  if (lastSpace > 8) preview = preview.slice(0, lastSpace);
                }
                preview = preview
                  .replace(/[\n\r]+/g, " ")
                  .replace(/\s+/g, " ")
                  .trim();
                if (preview) {
                  state.renameThread(effectiveId, preview, {
                    allowAutoReplace: true,
                  });
                }
              }
            }

            // AI upgrade on assistant completion with cooldown
            try {
              const current = state.threads.get(effectiveId);
              const meta = (current?.metadata || {}) as Record<string, unknown>;
              const manual = meta.manualTitle === true;
              if (!manual && threadTitleApi) {
                const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes
                const last =
                  typeof meta.lastAutoTitleAt === "number"
                    ? (meta.lastAutoTitleAt as number)
                    : 0;
                const now = Date.now();
                if (now - last >= COOLDOWN_MS) {
                  // mark attempt time immediately to avoid duplicate triggers
                  state.updateThreadMetadata?.(effectiveId, {
                    lastAutoTitleAt: now,
                  });
                  // Send in the last n messages as context (prefer store snapshot just persisted)
                  const storeMsgs = (state.threads.get(effectiveId)?.messages ||
                    []) as UIMessage[];
                  const source =
                    storeMsgs.length > 0
                      ? storeMsgs
                      : (chatHook.messages as UIMessage[]) || [];
                  const sample = source.slice(-threadTitleSampleCount);
                  const payload = {
                    messages: sample,
                    previousTitle:
                      typeof current?.title === "string"
                        ? current?.title
                        : undefined,
                  } as any;
                  fetch(threadTitleApi, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  })
                    .then(async (r) => {
                      if (!r.ok) return;
                      const data: { title?: string } = await r.json();
                      if (data.title) {
                        state.renameThread(effectiveId, data.title, {
                          allowAutoReplace: true,
                        });
                      }
                    })
                    .catch(() => {});
                }
              }
            } catch {
              /* ignore */
            }
          }
        } catch {}
      }
    },
    onError: () => {
      setError("Chat error occurred");
    },
  });

  // Keep track of last thread id AND per-thread input drafts
  const lastThreadIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!threadStore) return;
    const effectiveId = threadId ?? storeActiveThreadId;
    if (effectiveId === lastThreadIdRef.current) return;
    const prev = lastThreadIdRef.current;
    lastThreadIdRef.current = effectiveId;
    // Unload previous (optional optimization)
    if (prev) {
      try {
        const st = threadStore.getState();
        // Keep it loaded if we might come back? For now, unload to save memory.
        st.unloadThread?.(prev);
      } catch {}
    }
    if (effectiveId) {
      // Ensure loaded
      try {
        const st = threadStore.getState();
        if (!st.getThreadIfLoaded?.(effectiveId)) {
          st.loadThread(effectiveId)
            .then((t) => {
              if (!t) return;
              const storeMsgs = t.messages as UIMessage[];
              const existing = chatHook.messages;
              const differs =
                existing.length !== storeMsgs.length ||
                existing.some((m, i) => storeMsgs[i]?.id !== m.id);
              if (differs) chatHook.setMessages(storeMsgs);
            })
            .catch(() => {});
        } else {
          const t = st.getThreadIfLoaded(effectiveId);
          if (t) {
            const storeMsgs = t.messages as UIMessage[];
            const existing = chatHook.messages;
            const differs =
              existing.length !== storeMsgs.length ||
              existing.some((m, i) => storeMsgs[i]?.id !== m.id);
            if (differs) chatHook.setMessages(storeMsgs);
          }
        }
      } catch {}
    } else {
      // no active thread
      chatHook.setMessages([]);
    }
  }, [threadId, storeActiveThreadId, chatHook]);

  // Note: Removed chat store sync - causes infinite re-renders
  // The chat hook manages its own state internally

  // Helper to attach tool results to the chat
  function addToolResultForCall(
    toolCall: { toolName: string; toolCallId: string; input: unknown },
    output: unknown
  ) {
    try {
      chatHook.addToolResult({
        tool: toolCall.toolName as string,
        toolCallId: toolCall.toolCallId,
        output: output,
      });
    } catch {}
  }

  const sendMessageWithContext = (content: string) => {
    setError(null);
    chatHook.sendMessage({ text: content });
    if (threadStore) {
      // schedule microtask after message appended by hook
      queueMicrotask(() => {
        try {
          const state = threadStore.getState();
          const effectiveId = threadId ?? state.activeThreadId;
          if (effectiveId && state.threads.get(effectiveId)) {
            state.updateThreadMessages(
              effectiveId,
              chatHook.messages as UIMessage[]
            );
            // Initial placeholder title: first user message preview if untitled
            const t = state.threads.get(effectiveId);
            if (t && (!t.title || (t.metadata as any)?.autoTitled === true)) {
              if (!t.title) {
                const raw = String(content ?? "").trim();
                if (raw) {
                  const PREVIEW_LEN = 24; // keep in sync with UI truncation
                  let preview = raw.slice(0, PREVIEW_LEN);
                  if (raw.length > PREVIEW_LEN) {
                    const lastSpace = preview.lastIndexOf(" ");
                    if (lastSpace > 8) preview = preview.slice(0, lastSpace);
                    preview = preview + "…"; // indicate truncation in preview
                  }
                  preview = preview
                    .replace(/[\n\r]+/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
                  if (preview) {
                    state.renameThread(effectiveId, preview, {
                      allowAutoReplace: true,
                    });
                  }
                }
              }
              // Note: AI upgrade is triggered on assistant completion only (see onFinish)
            }
          }
        } catch {}
      });
    }
  };

  // Send AI command message with specific tool filtering
  const sendAICommandMessage = (
    content: string,
    toolName: string,
    commandSystemPrompt?: string
  ) => {
    setError(null);

    // Filter tools to only include the specified tool (per-call override via body)
    const allTools = useAIToolsStore.getState().serializeToolsForBackend();
    const filteredTools = allTools.filter((tool) => tool.name === toolName);

    // Send message with per-call overrides; transport will pick these up in prepareSendMessagesRequest
    chatHook.sendMessage(
      { text: content },
      {
        body: {
          tools: filteredTools,
          systemPrompt: commandSystemPrompt || systemPrompt,
        },
      }
    );
    if (threadStore) {
      queueMicrotask(() => {
        try {
          const state = threadStore.getState();
          const effectiveId = threadId ?? state.activeThreadId;
          if (effectiveId && state.threads.get(effectiveId)) {
            state.updateThreadMessages(
              effectiveId,
              chatHook.messages as UIMessage[]
            );
          }
        } catch {}
      });
    }
  };

  // Retry last message with error recovery
  const retryLastMessage = () => {
    const lastMessage = chatHook.messages[chatHook.messages.length - 1];
    if (lastMessage?.role === "user") {
      // Find the text part in the last user message
      const textPart = lastMessage.parts?.find((part) => part.type === "text");
      if (textPart && "text" in textPart) {
        sendMessageWithContext(textPart.text);
      }
    }
  };

  // Clear error function
  const clearError = () => {
    setError(null);
  };

  // --- Internal autosave logic ---
  const lastSavedSignatureRef = useRef<string | undefined>(undefined);

  function computeSignature(msgs: UIMessage[]): string {
    // Use length + last 5 ids for cheap change detection
    const tailIds = msgs
      .slice(-5)
      .map((m) => m.id)
      .join("|");
    return `${msgs.length}:${tailIds}`;
  }

  function persistMessagesIfChanged(reason: string) {
    const effectiveId =
      threadId ??
      (() => {
        try {
          return threadStore.getState().activeThreadId;
        } catch {
          return undefined;
        }
      })();
    if (!effectiveId) return;
    try {
      const store = threadStore.getState();
      const loaded = store.getThreadIfLoaded?.(effectiveId);
      if (!loaded) return; // only persist hydrated threads
      const msgs = chatHook.messages as UIMessage[];
      const sig = computeSignature(msgs);
      if (sig === lastSavedSignatureRef.current) return;
      store.updateThreadMessages(effectiveId, msgs);
      lastSavedSignatureRef.current = sig;
      // Optionally debug: console.debug('[acb][autosave]', reason, sig)
    } catch {
      /* ignore */
    }
  }

  // Persist whenever messages settle and we are idle (not streaming/submitting)
  useEffect(() => {
    const effectiveId = threadId ?? storeActiveThreadId;
    if (!effectiveId) return;
    if (chatHook.status === "streaming" || chatHook.status === "submitted")
      return;
    persistMessagesIfChanged("idle");
  }, [threadId, storeActiveThreadId, chatHook.status, chatHook.messages]);

  // Removed prior periodic re-title effect; AI upgrade is triggered on assistant completion with cooldown

  // Persist on unmount
  useEffect(() => {
    return () => {
      persistMessagesIfChanged("unmount");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...chatHook,
    input: draftInput,
    setInput: setDraftInput,
    sendMessageWithContext,
    sendAICommandMessage,
    retryLastMessage,
    clearError,
    isLoading:
      chatHook.status === "streaming" || chatHook.status === "submitted",
    // Expose cached reactive store state for components that need it
    context,
    availableTools,
    tools,
    focusItems,
  };
}
