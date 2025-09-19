import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  UIMessage,
} from "ai";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
// z import removed - no longer needed without planning schemas
import { useShallow } from "zustand/react/shallow";
import {
  useAIContextStore,
  useAIFocusStore,
  useAIMCPServersStore,
  useAIModelsStore,
  useAIToolsStore,
  useChatThreadsStore,
} from "../stores";
import { useChatStore } from "../stores/";
import type { SerializedMCPServer } from "../stores/mcp";
import type { SerializedTool } from "../stores/tools";
// Planning types and schemas removed - using flow capture instead
import type { ChatModelOption, ChatRequest } from "../types/chat";
import { buildEnrichedSystemPrompt } from "../utils/prompt-utils";
import { useChainOfThought } from "./use-chain-of-thought";

const EMPTY_MODEL_OPTIONS: ChatModelOption[] = [];

export interface UseAIChatOptions {
  transport?: {
    api?: string;
  };
  messages?: {
    systemPrompt?: string;
    initial?: UIMessage[];
  };
  thread?: {
    id?: string;
    scopeKey?: string;
    autoCreate?: boolean;
    warnOnMissing?: boolean;
    title?: {
      api?: string;
      sampleCount?: number;
    };
  };
  features?: {
    chainOfThought?: boolean;
  };
  mcp?: {
    enabled?: boolean;
    api?: string;
    servers?: SerializedMCPServer[];
  };
  models?: {
    available?: ChatModelOption[];
    initial?: string;
  };
}

const isSerializedToolArray = (value: unknown): value is SerializedTool[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item !== null &&
      typeof item === "object" &&
      "name" in item &&
      typeof (item as { name?: unknown }).name === "string"
  );

const isSerializedMCPServerArray = (
  value: unknown
): value is SerializedMCPServer[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item !== null &&
      typeof item === "object" &&
      "id" in item &&
      typeof (item as { id?: unknown }).id === "string" &&
      "transport" in item &&
      typeof (item as { transport?: unknown }).transport === "object"
  );

type ChatHelpers = ReturnType<typeof useChat>;

const hasAutoTitledFlag = (metadata?: Record<string, unknown>): boolean => {
  if (!metadata) return false;
  const flag = (metadata as { autoTitled?: unknown }).autoTitled;
  return flag === true;
};

export function useAIChat({
  transport,
  messages,
  thread,
  features,
  mcp,
  models: modelsGroup,
}: UseAIChatOptions = {}) {
  const api = transport?.api ?? "/api/chat";
  const systemPrompt = messages?.systemPrompt;
  const initialMessages = messages?.initial;
  const threadId = thread?.id;
  const scopeKey = thread?.scopeKey;
  const chainOfThoughtEnabled = features?.chainOfThought ?? false;
  const threadTitleApi = thread?.title?.api ?? "";
  const threadTitleSampleCount = thread?.title?.sampleCount ?? 8;
  const autoCreateThread = thread?.autoCreate ?? true;
  const warnOnMissingThread = thread?.warnOnMissing ?? false;
  const incomingModels = modelsGroup?.available ?? EMPTY_MODEL_OPTIONS;
  const providedModel = modelsGroup?.initial;
  const mcpEnabled = mcp?.enabled ?? false;

  const { models, selectedModelId } = useAIModelsStore(
    useShallow((state) => ({
      models: state.models,
      selectedModelId: state.selectedModelId,
    }))
  );
  const setModelsInStore = useAIModelsStore((state) => state.setModels);

  useEffect(() => {
    const state = useAIModelsStore.getState();
    const currentModels = state.models;

    const sameModels =
      currentModels.length === incomingModels.length &&
      currentModels.every((model, index) => {
        const incoming = incomingModels[index];
        if (!incoming) return false;
        return (
          model.id === incoming.id &&
          model.label === incoming.label &&
          model.description === incoming.description
        );
      });

    const preferredRequested =
      providedModel !== undefined &&
      incomingModels.some((model) => model.id === providedModel);

    const preferredMatchesSelection = providedModel === state.selectedModelId;

    if (!sameModels || (preferredRequested && !preferredMatchesSelection)) {
      setModelsInStore(incomingModels, { preferredId: providedModel });
      return;
    }

    if (state.selectedModelId) {
      const stillValid = incomingModels.some(
        (model) => model.id === state.selectedModelId
      );
      if (!stillValid) {
        setModelsInStore(incomingModels, { preferredId: providedModel });
      }
    }
  }, [incomingModels, providedModel, setModelsInStore]);

  const selectedModelRef = useRef<string | undefined>(selectedModelId);

  useEffect(() => {
    selectedModelRef.current = selectedModelId;
  }, [selectedModelId]);

  const setModel = React.useCallback((modelId: string) => {
    useAIModelsStore.getState().setSelectedModelId(modelId);
  }, []);

  // Get raw store data with stable selectors - these return the same reference when unchanged
  const contextItemsMap = useAIContextStore(
    useShallow((state) => state.contextItems)
  );
  const toolsMap = useAIToolsStore(useShallow((state) => state.tools));
  const focusItemsMap = useAIFocusStore(
    useShallow((state) => state.focusItems)
  );
  const { registerTool, unregisterTool } = useAIToolsStore(
    useShallow((state) => ({
      registerTool: state.registerTool,
      unregisterTool: state.unregisterTool,
    }))
  );
  const executeTool = useAIToolsStore((state) => state.executeTool);
  const setError = useChatStore((state) => state.setError);
  const storeActiveThreadId = useChatThreadsStore(
    (state) => state.activeThreadId
  );
  const setMcpEnabled = useAIMCPServersStore((state) => state.setEnabled);
  const setMcpDefaultApi = useAIMCPServersStore((state) => state.setDefaultApi);
  const setMcpConfigurations = useAIMCPServersStore(
    (state) => state.setConfigurations
  );

  // Only register the chain of thought hook, passing chainOfThoughtEnabled
  useChainOfThought({
    enabled: chainOfThoughtEnabled,
    registerTool,
    unregisterTool,
  });

  // Removed chain of thought state and effects

  useEffect(() => {
    setMcpEnabled(mcpEnabled);
    if (!mcpEnabled) return;
    try {
      if (mcp?.api) {
        setMcpDefaultApi(mcp.api);
      }
      if (Array.isArray(mcp?.servers)) {
        setMcpConfigurations(mcp.servers);
      }
    } catch {
      /* ignore */
    }
  }, [
    mcpEnabled,
    mcp?.api,
    mcp?.servers,
    setMcpDefaultApi,
    setMcpEnabled,
    setMcpConfigurations,
  ]);

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

  const systemPromptRef = useRef(systemPrompt);

  // Update ref when systemPrompt changes
  useEffect(() => {
    systemPromptRef.current = systemPrompt;
  }, [systemPrompt]);

  // Create transport with dynamic request preparation - only recreate when api changes
  const chatTransport = useMemo(() => {
    return new DefaultChatTransport({
      api,
      prepareSendMessagesRequest: async (options) => {
        // Get fresh store data for each request - called only when sending messages
        const currentContext = await useAIContextStore.getState().serialize();
        const currentTools = useAIToolsStore
          .getState()
          .serializeToolsForBackend();
        const currentFocusItems = useAIFocusStore.getState().getAllFocusItems();
        const mcpStore = useAIMCPServersStore.getState();
        const currentMcpServers = mcpStore.serializeServersForBackend();
        const mcpToolSummaries = mcpStore.getAllToolSummaries();
        const callerBody = (options.body ?? {}) as Record<string, unknown>;

        // Per-call overrides validated for expected structure
        const overrideTools = isSerializedToolArray(callerBody["tools"])
          ? callerBody["tools"]
          : undefined;
        const overrideMcpServers = isSerializedMCPServerArray(
          callerBody["mcpServers"]
        )
          ? callerBody["mcpServers"]
          : undefined;
        const overrideSystemPrompt =
          typeof callerBody["systemPrompt"] === "string"
            ? (callerBody["systemPrompt"] as string)
            : undefined;
        const overrideEnrichedSystemPrompt =
          typeof callerBody["enrichedSystemPrompt"] === "string"
            ? (callerBody["enrichedSystemPrompt"] as string)
            : undefined;
        const overrideModel =
          typeof callerBody["model"] === "string"
            ? (callerBody["model"] as string)
            : undefined;

        const toolsToSend = overrideTools ?? currentTools;
        const mcpServersToSend = overrideMcpServers ?? currentMcpServers;
        const systemPromptToSend =
          overrideSystemPrompt ?? systemPromptRef.current;
        // No chain of thought prompt

        const toolSummaryMap = new Map<
          string,
          { name: string; description?: string }
        >();
        toolsToSend.forEach((tool) => {
          if (!tool?.name) return;
          if (!toolSummaryMap.has(tool.name)) {
            toolSummaryMap.set(tool.name, {
              name: tool.name,
              description: tool.description,
            });
          }
        });
        mcpToolSummaries.forEach((tool) => {
          if (!tool?.name) return;
          if (!toolSummaryMap.has(tool.name)) {
            toolSummaryMap.set(tool.name, {
              name: tool.name,
              description: tool.description,
            });
          }
        });
        const combinedToolSummaries = Array.from(toolSummaryMap.values());

        // Build enriched system prompt unless explicitly supplied
        const enrichedSystemPromptToSend =
          overrideEnrichedSystemPrompt ??
          buildEnrichedSystemPrompt({
            originalSystemPrompt: systemPromptToSend,
            context: currentContext,
            focus: currentFocusItems,
            tools: combinedToolSummaries,
            chainOfThoughtEnabled,
          });

        const body: ChatRequest & Record<string, unknown> = {
          ...callerBody,
          messages: options.messages as UIMessage[],
          context: currentContext,
          tools: toolsToSend,
          mcpServers: mcpServersToSend,
          focus: currentFocusItems, // Send complete focus items
          systemPrompt: systemPromptToSend,
          enrichedSystemPrompt: enrichedSystemPromptToSend,
        };

        if (overrideModel !== undefined) {
          body.model = overrideModel;
        } else if (selectedModelRef.current) {
          body.model = selectedModelRef.current;
        }

        return {
          ...options,
          body,
        };
      },
    });
  }, [api, chainOfThoughtEnabled]); // systemPrompt removed - now uses stable ref

  const [draftInput, setDraftInput] = useState("");

  // Create refs to access chat functions without causing re-renders
  const chatHookRef = useRef<ChatHelpers | null>(null);

  const chatHook = useChat({
    transport: chatTransport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    messages: existingThreadMessages ?? initialMessages,
    experimental_throttle: 100,
    // Will be added in future version for additional throttling
    onToolCall: async ({ toolCall }) => {
      try {
        // Execute frontend tool if available
        if (!toolCall.dynamic) {
          const result = await executeTool(toolCall.toolName, toolCall.input);
          // Add the tool result to the chat stream and still return it
          addToolResultForCall(toolCall, result);
        }
      } catch (error) {
        setError("Tool execution failed");
        throw error;
      }
    },
    onFinish: () => {
      // Persist updated messages into thread (if any)
      if (threadStore) {
        try {
          const state = threadStore.getState();
          const effectiveId = threadId ?? state.activeThreadId;
          if (effectiveId && state.threads.get(effectiveId)) {
            state.updateThreadMessages(effectiveId, chatHook.messages);
            // Immediate default title after first user message (if no manual title)
            const tNow = state.threads.get(effectiveId);
            if (tNow && !tNow.title) {
              const firstUserMessage = chatHook.messages.find(
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
                  const payload: {
                    messages: UIMessage[];
                    previousTitle?: string;
                  } = {
                    messages: sample,
                    previousTitle:
                      typeof current?.title === "string"
                        ? current.title
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

  // Update ref to latest chatHook for stable callback access
  useEffect(() => {
    chatHookRef.current = chatHook;
  }, [chatHook]);

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
  }, [threadId, storeActiveThreadId, chatHook, threadStore]);

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

  const sendMessageWithContext = useCallback(
    (content: string) => {
      setError(null);
      chatHookRef.current?.sendMessage({ text: content });
      if (threadStore) {
        // schedule microtask after message appended by hook
        queueMicrotask(() => {
          try {
            const state = threadStore.getState();
            const effectiveId = threadId ?? state.activeThreadId;
            if (effectiveId && state.threads.get(effectiveId)) {
              state.updateThreadMessages(
                effectiveId,
                chatHookRef.current?.messages as UIMessage[]
              );
              // Initial placeholder title: first user message preview if untitled
              const t = state.threads.get(effectiveId);
              if (t && (!t.title || hasAutoTitledFlag(t.metadata))) {
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
              }
            }
          } catch {}
        });
      }
    },
    [threadId, setError, threadStore]
  );

  // Send AI command message with specific tool filtering
  const sendAICommandMessage = useCallback(
    (content: string, toolName: string, commandSystemPrompt?: string) => {
      setError(null);

      // Filter tools to only include the specified tool (per-call override via body)
      const allTools = useAIToolsStore.getState().serializeToolsForBackend();
      const filteredTools = allTools.filter((tool) => tool.name === toolName);

      // Send message with per-call overrides; transport will pick these up in prepareSendMessagesRequest
      chatHookRef.current?.sendMessage(
        { text: content },
        {
          body: {
            tools: filteredTools,
            systemPrompt: commandSystemPrompt || systemPromptRef.current,
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
                chatHookRef.current?.messages as UIMessage[]
              );
            }
          } catch {}
        });
      }
    },
    [threadId, setError, threadStore]
  );

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

  const persistMessagesIfChanged = useCallback(
    (reason?: string) => {
      void reason;
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
    },
    [threadId, threadStore, chatHook.messages]
  );

  // Persist whenever messages settle and we are idle (not streaming/submitting)
  useEffect(() => {
    const effectiveId = threadId ?? storeActiveThreadId;
    if (!effectiveId) return;
    if (chatHook.status === "streaming" || chatHook.status === "submitted")
      return;
    persistMessagesIfChanged("idle");
  }, [
    threadId,
    storeActiveThreadId,
    chatHook.status,
    chatHook.messages,
    persistMessagesIfChanged,
  ]);

  // Removed prior periodic re-title effect; AI upgrade is triggered on assistant completion with cooldown

  // Persist on unmount
  useEffect(() => {
    return () => {
      persistMessagesIfChanged("unmount");
    };
  }, [persistMessagesIfChanged]);

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
    mcpEnabled,
    models,
    model: selectedModelId,
    setModel,
    // Expose options for UI components
    threadId,
    scopeKey,
    chainOfThoughtEnabled,
  };
}
