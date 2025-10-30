import { useChat } from "@ai-sdk/react";
import type { PrepareSendMessagesRequest } from "ai";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  UIMessage,
} from "ai";
import isEqual from "fast-deep-equal";
import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
// z import removed - no longer needed without planning schemas
import { useShallow } from "zustand/react/shallow";
import {
  useAICompressionStore,
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
import type { ChatThreadTimeline } from "../types/threads";
// Planning types and schemas removed - using flow capture instead
import type { ChatModelOption, ChatRequest, Suggestion } from "../types/chat";
import {
  COMPRESSION_THREAD_METADATA_KEY,
  type BuildCompressionPayloadResult,
  type CompressionConfig,
  type CompressionPinnedMessage,
  type CompressionRunOptions,
  type CompressionUsage,
  type PersistedCompressionState,
} from "../types/compression";
import { buildCompressionPayload } from "../utils/compression/build-payload";
import {
  applyCompressionMetadataToMessages,
  ensureCompressionEventMessage,
  extractPinnedMessagesFromMetadata,
  withCompressionPinnedState,
  type CompressionMessagePinnedState,
} from "../utils/compression/message-metadata";
import {
  buildPersistedCompressionState,
  clonePersistedCompressionState,
} from "../utils/compression/persistence";
import { logDevError } from "../utils/dev-logger";
import { fetchMCPServerTools } from "../utils/mcp-utils";
import { normalizeMessagesMetadata } from "../utils/message-normalization";
import { buildEnrichedSystemPrompt } from "../utils/prompt-utils";
import { useAIChatBranching } from "./use-ai-chat-branching";
import { useAIChatCompression } from "./use-ai-chat-compression";
import { useChainOfThought } from "./use-chain-of-thought";
import { useSuggestions, type UseSuggestionsOptions } from "./use-suggestions";

const EMPTY_MODEL_OPTIONS: ChatModelOption[] = [];

function hasMeaningfulUsageChange(
  previous: CompressionUsage | null,
  next: CompressionUsage
): boolean {
  if (!previous) return true;

  if (previous.totalTokens !== next.totalTokens) return true;
  if (previous.pinnedTokens !== next.pinnedTokens) return true;
  if (previous.artifactTokens !== next.artifactTokens) return true;
  if (previous.survivingTokens !== next.survivingTokens) return true;

  const prevEstimated = previous.estimatedResponseTokens ?? null;
  const nextEstimated = next.estimatedResponseTokens ?? null;
  if (prevEstimated !== nextEstimated) return true;

  const prevRemaining = previous.remainingTokens ?? null;
  const nextRemaining = next.remainingTokens ?? null;
  if (prevRemaining !== nextRemaining) return true;

  const prevBudget = previous.budget ?? null;
  const nextBudget = next.budget ?? null;
  if (prevBudget !== nextBudget) return true;

  return false;
}

export interface DevToolsConfig {
  /**
   * Master switch to enable all dev tools features.
   * When enabled, turns on error logging and debug UI components.
   * Defaults to false (production-safe).
   */
  enabled?: boolean;
  /**
   * Show detailed error messages in the console.
   * Overrides the enabled setting if explicitly set.
   * Defaults to the value of `enabled`.
   */
  showErrorMessages?: boolean;
}

export interface ThreadTitleOptions {
  enabled?: boolean;
  api?: string;
  sampleCount?: number;
}

export interface ThreadsOptions {
  enabled?: boolean;
  id?: string;
  scopeKey?: string;
  autoCreate?: boolean;
  warnOnMissing?: boolean;
  title?: ThreadTitleOptions;
}

export interface SuggestionsOptions {
  enabled?: boolean;
  prompt?: string;
  count?: number;
  strategy?: UseSuggestionsOptions["strategy"];
  debounceMs?: number;
  api?: string;
  fetcher?: UseSuggestionsOptions["fetcher"];
}

export interface UseAIChatOptions {
  transport?: {
    api?: string;
    prepareSendMessagesRequest?: PrepareSendMessagesRequest<UIMessage>;
  };
  messages?: {
    systemPrompt?: string;
    initial?: UIMessage[];
  };
  threads?: ThreadsOptions;
  features?: {
    chainOfThought?: boolean;
    branching?: boolean;
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
  compression?: CompressionConfig;
  suggestions?: SuggestionsOptions;
  devTools?: DevToolsConfig;
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

export type { ChatHelpers };

const hasAutoTitledFlag = (metadata?: Record<string, unknown>): boolean => {
  if (!metadata) return false;
  const flag = (metadata as { autoTitled?: unknown }).autoTitled;
  return flag === true;
};

export function useAIChat({
  transport,
  messages,
  threads,
  features,
  mcp,
  models: modelsGroup,
  compression: compressionOptions,
  suggestions: suggestionsOptions,
  devTools,
}: UseAIChatOptions = {}) {
  const transportOptions = transport ?? {};
  const api = transportOptions.api ?? "/api/chat";
  const userPrepareSendMessagesRequest =
    transportOptions.prepareSendMessagesRequest;
  const systemPrompt = messages?.systemPrompt;
  const initialMessages = messages?.initial;
  const threadsGroup = threads ?? {};
  const threadId = threadsGroup.id;
  const scopeKey = threadsGroup.scopeKey;
  const chainOfThoughtEnabled = features?.chainOfThought ?? false;
  const branchingEnabled = features?.branching ?? false;
  const threadTitleOptions = threadsGroup.title;
  const threadTitleEnabled =
    threadTitleOptions?.enabled ?? Boolean(threadTitleOptions?.api);
  const threadTitleApi =
    threadTitleEnabled && threadTitleOptions?.api ? threadTitleOptions.api : "";
  const threadTitleSampleCount = threadTitleOptions?.sampleCount ?? 8;
  const autoCreateThread = threadsGroup.autoCreate ?? true;
  const warnOnMissingThread = threadsGroup.warnOnMissing ?? false;
  const threadsEnabled = threadsGroup.enabled ?? false;
  const incomingModels = modelsGroup?.available ?? EMPTY_MODEL_OPTIONS;
  const providedModel = modelsGroup?.initial;
  const mcpEnabled = mcp?.enabled ?? false;
  const suggestionsConfig = suggestionsOptions;
  const suggestionsEnabled = suggestionsConfig?.enabled ?? false;
  const suggestionCount = suggestionsConfig?.count ?? 3;

  // Compute devTools flags - enabled is false by default (production-safe)
  const devToolsEnabled = devTools?.enabled ?? false;
  const showErrorMessages = devTools?.showErrorMessages ?? devToolsEnabled;

  const { models, selectedModelId } = useAIModelsStore(
    useShallow((state) => ({
      models: state.models,
      selectedModelId: state.selectedModelId,
    }))
  );
  const setModelsInStore = useAIModelsStore((state) => state.setModels);

  const compressionEnabled = compressionOptions?.enabled ?? false;

  if (compressionEnabled) {
    const missingContextWindow = incomingModels.filter((model) => {
      const windowSize = model.contextWindowTokens;
      return (
        windowSize === undefined ||
        windowSize === null ||
        typeof windowSize !== "number" ||
        !Number.isFinite(windowSize) ||
        windowSize <= 0
      );
    });

    if (missingContextWindow.length > 0) {
      const missingIds = missingContextWindow
        .map((model) => model.id ?? "<unknown>")
        .join(", ");
      throw new Error(
        `[acb][useAIChat] compression is enabled but the following models are missing a valid contextWindowTokens value: ${missingIds}`
      );
    }
  }

  const activeModel = useMemo(() => {
    if (models.length === 0) return null;
    if (selectedModelId) {
      const selected = models.find((model) => model.id === selectedModelId);
      if (selected) {
        return selected;
      }
    }
    return models[0] ?? null;
  }, [models, selectedModelId]);

  const resolvedCompressionOptions = useMemo<
    CompressionConfig | undefined
  >(() => {
    if (!compressionOptions) {
      return compressionEnabled ? { enabled: true } : undefined;
    }

    const base: CompressionConfig = {
      ...compressionOptions,
      enabled: compressionOptions.enabled ?? compressionEnabled,
    };

    if (!base.enabled) {
      return base;
    }

    const modelWindow = activeModel?.contextWindowTokens;
    if (
      base.maxTokenBudget === undefined &&
      modelWindow !== undefined &&
      modelWindow !== null
    ) {
      base.maxTokenBudget = modelWindow;
    }

    const modelThreshold = activeModel?.contextCompressionThreshold;
    if (
      base.compressionThreshold === undefined &&
      modelThreshold !== undefined &&
      modelThreshold !== null &&
      typeof modelThreshold === "number" &&
      Number.isFinite(modelThreshold)
    ) {
      base.compressionThreshold = Math.min(Math.max(modelThreshold, 0), 1);
    }

    return base;
  }, [compressionOptions, compressionEnabled, activeModel]);

  const compressionHelpers = useAIChatCompression({
    compression: resolvedCompressionOptions,
  });
  const buildCompressionRequestPayload = compressionHelpers.buildPayload;
  const baseCompressionController = compressionHelpers.controller;
  const compressionConfig = compressionHelpers.config;
  const setCompressionModelMetadata =
    baseCompressionController.actions.setModelMetadata;

  const compressionModelMetadata = useMemo(() => {
    if (!resolvedCompressionOptions?.enabled || !activeModel) {
      return null;
    }

    return {
      modelId: activeModel.id,
      modelLabel: activeModel.label,
      contextWindowTokens: activeModel.contextWindowTokens ?? undefined,
    } as const;
  }, [resolvedCompressionOptions?.enabled, activeModel]);

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
          model.description === incoming.description &&
          model.contextWindowTokens === incoming.contextWindowTokens &&
          model.contextCompressionThreshold ===
            incoming.contextCompressionThreshold
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

  useEffect(() => {
    if (!setCompressionModelMetadata) return;

    const currentMetadata = useAICompressionStore.getState().modelMetadata;

    if (!compressionModelMetadata) {
      if (currentMetadata !== null) {
        setCompressionModelMetadata(null);
      }
      return;
    }

    const isSame =
      currentMetadata?.modelId === compressionModelMetadata.modelId &&
      currentMetadata?.modelLabel === compressionModelMetadata.modelLabel &&
      currentMetadata?.contextWindowTokens ===
        compressionModelMetadata.contextWindowTokens;

    if (isSame) {
      return;
    }

    setCompressionModelMetadata({
      ...compressionModelMetadata,
      lastUpdatedAt: Date.now(),
    });
  }, [compressionModelMetadata, setCompressionModelMetadata]);

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
  const registerServer = useAIMCPServersStore((state) => state.registerServer);
  const setServerLoading = useAIMCPServersStore(
    (state) => state.setServerLoading
  );
  const setServerError = useAIMCPServersStore((state) => state.setServerError);
  const setServerTools = useAIMCPServersStore((state) => state.setServerTools);

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
    } catch (error) {
      logDevError(
        "[acb][useAIChat] failed to configure MCP servers from props",
        error,
        showErrorMessages
      );
    }
  }, [
    mcpEnabled,
    mcp?.api,
    mcp?.servers,
    setMcpDefaultApi,
    setMcpEnabled,
    setMcpConfigurations,
    showErrorMessages,
  ]);

  // Auto-fetch tools for servers configured via mcp.servers prop
  useEffect(() => {
    if (!mcpEnabled || !Array.isArray(mcp?.servers)) return;

    const api = mcp?.api ?? "/api/mcp-discovery";
    const mcpStore = useAIMCPServersStore.getState();

    // Fetch tools for each configured server
    mcp.servers.forEach((server) => {
      const configSignature = JSON.stringify({
        name: server.name ?? null,
        transport: server.transport,
      });

      // Check if server already exists with same config
      const existingServer = mcpStore.servers.get(server.id);
      const shouldFetch =
        !existingServer ||
        existingServer.configSignature !== configSignature ||
        (!existingServer.tools.length &&
          !existingServer.error &&
          !existingServer.isLoading);

      // Register the server (registerServer handles config changes)
      registerServer({
        id: server.id,
        name: server.name,
        transport: server.transport,
        configSignature,
      });

      // Only fetch if needed
      if (shouldFetch) {
        setServerLoading(server.id, true);
        setServerError(server.id, null);

        fetchMCPServerTools({
          serverId: server.id,
          name: server.name,
          transport: server.transport,
          api,
        })
          .then((result) => {
            setServerTools(server.id, result.tools, result.error ?? undefined);
            if (result.error && result.tools.length === 0) {
              setServerError(server.id, result.error);
            }
          })
          .catch((error) => {
            const message =
              error instanceof Error
                ? error.message
                : "Failed to load MCP tools";
            setServerError(server.id, message);
          });
      }
    });
  }, [
    mcpEnabled,
    mcp?.api,
    mcp?.servers,
    registerServer,
    setServerLoading,
    setServerError,
    setServerTools,
  ]);

  // Direct reference to the zustand store object (not a hook call) for imperative ops
  const threadStore = useChatThreadsStore; // NOTE: used in effects below (getState())

  const [isRestoringThread, setIsRestoringThread] = useState(false);
  const updateIsRestoringThread = useCallback((next: boolean) => {
    setIsRestoringThread((prev) => (prev === next ? prev : next));
  }, []);

  // Configure persistence mode based on threads enabled flag.
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
        "[acb][useAIChat] failed to configure chat thread persistence mode",
        error,
        showErrorMessages
      );
    }
  }, [threadStore, threadsEnabled, showErrorMessages]);

  // Apply scopeKey (if provided) and load threads for that scope the first time or when scope changes.
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
            `[acb][useAIChat] failed to load thread summaries for scope "${scopeKey}"`,
            error,
            showErrorMessages
          );
        });
      }
    } catch (error) {
      logDevError(
        "[acb][useAIChat] failed to resolve thread scope metadata",
        error,
        showErrorMessages
      );
    }
  }, [scopeKey, threadStore, showErrorMessages]);

  // When no threadId provided, choose most recently updated in scope or create a new one.
  useEffect(() => {
    if (threadId) return; // caller controls id
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
              `[acb][useAIChat] failed to load thread summaries before selecting default thread (scope "${
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
            const differs =
              chatHook.messages.length !== storeMsgs.length ||
              chatHook.messages.some((m, i) => storeMsgs[i]?.id !== m.id);
            if (differs) chatHook.setMessages(storeMsgs);
            return;
          }

          startRestoring();
          const timeline = await state.ensureTimeline(activeId);
          if (timeline) {
            const storeMsgs = timeline.messages as UIMessage[];
            const differs =
              chatHook.messages.length !== storeMsgs.length ||
              chatHook.messages.some((m, i) => storeMsgs[i]?.id !== m.id);
            if (differs) chatHook.setMessages(storeMsgs);
            return;
          }
        }

        const summaries = state.listSummaries(scope);
        if (summaries.length > 0) {
          startRestoring();
          const latest = summaries[0]; // sorted by updatedAt desc in store
          state.setActiveThread(latest.id);
          const timeline =
            state.getTimeline(latest.id) ||
            (await state.ensureTimeline(latest.id));
          if (timeline) {
            const storeMsgs = timeline.messages as UIMessage[];
            const differs =
              chatHook.messages.length !== storeMsgs.length ||
              chatHook.messages.some((m, i) => storeMsgs[i]?.id !== m.id);
            if (differs) chatHook.setMessages(storeMsgs);
            return;
          }
        }

        if (!state.activeThreadId) {
          const record = state.createThread({ scopeKey: scope });
          state.setActiveThread(record.id);
          if (chatHook.messages.length > 0) {
            state.updateThreadMessages(
              record.id,
              chatHook.messages as UIMessage[]
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          logDevError(
            "[acb][useAIChat] failed to select or create a default thread",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, scopeKey]);

  // Load initial thread messages synchronously if already present in memory
  const existingThreadMessages: UIMessage[] | undefined = (() => {
    const effectiveId =
      threadId ??
      (() => {
        try {
          return useChatThreadsStore.getState().activeThreadId;
        } catch (error) {
          logDevError(
            "[acb][useAIChat] failed to read active thread id from store",
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
          `[acb][useAIChat] failed to read cached messages for thread "${effectiveId}"`,
          error,
          showErrorMessages
        );
        return undefined;
      }
    }
    return undefined;
  })();

  // If a threadId is provided but not yet in memory, attempt to load it from persistence.
  // If still missing, optionally create it (allowing pre-seeding a stable id from app state).
  React.useEffect(() => {
    if (!threadId) return; // only for controlled id
    let cancelled = false;
    try {
      const state = threadStore.getState();
      if (state.getTimeline(threadId)) {
        updateIsRestoringThread(false);
        return; // already loaded
      }

      updateIsRestoringThread(true);

      state
        .ensureTimeline(threadId)
        .then((timeline) => {
          if (cancelled) return;
          if (timeline) {
            // Set messages in hook if they differ (covers first mount where existingThreadMessages was undefined)
            const storeMsgs = timeline.messages as UIMessage[];
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
        .catch((error) => {
          if (cancelled) return;
          if (warnOnMissingThread) {
            console.warn(
              `[acb][useAIChat] failed loading threadId "${threadId}" from persistence`
            );
          }
          logDevError(
            `[acb][useAIChat] failed loading threadId "${threadId}" from persistence`,
            error,
            showErrorMessages
          );
          const s2 = threadStore.getState();
          if (autoCreateThread && !s2.getRecord(threadId)) {
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
        `[acb][useAIChat] failed handling provided threadId "${threadId}"`,
        error,
        showErrorMessages
      );
    }

    return () => {
      cancelled = true;
      updateIsRestoringThread(false);
    };
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
          {
            name: string;
            description?: string;
            source?: "frontend" | "mcp";
          }
        >();
        const upsertToolSummary = (
          name: string,
          description: string | undefined,
          source: "frontend" | "mcp"
        ) => {
          const existing = toolSummaryMap.get(name);
          const nextDescription =
            description?.trim() !== ""
              ? description
              : existing?.description ?? description;
          const nextSource =
            source === "mcp" || existing?.source === "mcp"
              ? "mcp"
              : existing?.source ?? source;
          toolSummaryMap.set(name, {
            name,
            description: nextDescription,
            source: nextSource,
          });
        };

        toolsToSend.forEach((tool) => {
          if (!tool?.name) return;
          upsertToolSummary(tool.name, tool.description, "frontend");
        });
        mcpToolSummaries.forEach((tool) => {
          if (!tool?.name) return;
          upsertToolSummary(tool.name, tool.description, "mcp");
        });
        const combinedToolSummaries = Array.from(toolSummaryMap.values());

        const compressionPayload = await buildCompressionRequestPayload(
          options.messages as UIMessage[]
        );

        const messagesForRequest = compressionPayload.messages;

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
          messages: messagesForRequest,
          context: currentContext,
          tools: toolsToSend,
          mcpServers: mcpServersToSend,
          focus: currentFocusItems, // Send complete focus items
          systemPrompt: systemPromptToSend,
          enrichedSystemPrompt: enrichedSystemPromptToSend,
        };

        body.compression = {
          pinnedMessageIds: compressionPayload.pinnedMessageIds,
          artifactIds: compressionPayload.artifactIds,
          survivingMessageIds: compressionPayload.survivingMessageIds,
        };

        if (overrideModel !== undefined) {
          body.model = overrideModel;
        } else if (selectedModelRef.current) {
          body.model = selectedModelRef.current;
        }

        const preparedRequest = {
          ...options,
          body,
        };

        if (!userPrepareSendMessagesRequest) {
          return preparedRequest;
        }

        try {
          const userResult = await userPrepareSendMessagesRequest({
            ...options,
            body,
          });

          if (!userResult) {
            return preparedRequest;
          }

          const mergedBody = userResult.body ?? preparedRequest.body;
          const mergedHeaders = userResult.headers ?? preparedRequest.headers;
          const mergedCredentials =
            userResult.credentials ?? preparedRequest.credentials;
          const mergedApi = userResult.api ?? preparedRequest.api ?? api;

          return {
            ...options,
            body: mergedBody,
            headers: mergedHeaders,
            credentials: mergedCredentials,
            api: mergedApi,
          };
        } catch (error) {
          logDevError(
            "[acb][useAIChat] prepareSendMessagesRequest callback failed",
            error,
            showErrorMessages
          );
          return preparedRequest;
        }
      },
    });
  }, [
    api,
    chainOfThoughtEnabled,
    buildCompressionRequestPayload,
    userPrepareSendMessagesRequest,
    showErrorMessages,
  ]);

  const [draftInput, setDraftInput] = useState("");

  // Create refs to access chat functions without causing re-renders
  const chatHookRef = useRef<ChatHelpers | null>(null);
  const suggestionsFinishRef = useRef<(() => void) | null>(null);

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
    onFinish: ({ message }) => {
      const latestMessages = messagesSnapshotRef.current.length > 0
        ? messagesSnapshotRef.current
        : (chatHookRef.current?.messages ?? chatHook.messages);

      suggestionsFinishRef.current?.();
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
        chatHook.setMessages(normalizedMessages);
      }
      // Persist updated messages into thread (if any)
      if (threadStore) {
        try {
            const state = threadStore.getState();
            const effectiveId = threadId ?? state.activeThreadId;
          if (effectiveId) {
            state.updateThreadMessages(effectiveId, messagesSnapshot);
            const record = state.getRecord(effectiveId);
            // Immediate default title after first user message (if no manual title)
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
                  refreshedState.renameThread(effectiveId, preview, {
                    allowAutoReplace: true,
                  });
                }
              }
            }

            // AI upgrade on assistant completion with cooldown
            try {
              const currentRecord = refreshedState.getRecord(effectiveId);
              const meta = (currentRecord?.metadata || {}) as Record<
                string,
                unknown
              >;
              const manual = meta.manualTitle === true;
              if (!manual && threadTitleEnabled && threadTitleApi) {
                const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes
                const last =
                  typeof meta.lastAutoTitleAt === "number"
                    ? (meta.lastAutoTitleAt as number)
                    : 0;
                const now = Date.now();
                if (now - last >= COOLDOWN_MS) {
                  // mark attempt time immediately to avoid duplicate triggers
                  refreshedState.updateThreadMetadata?.(effectiveId, {
                    lastAutoTitleAt: now,
                  });
                  // Send in the last n messages as context (prefer store snapshot just persisted)
                  const storeMsgs =
                    refreshedState.getTimeline(effectiveId)?.messages ?? [];
                  const source =
                    storeMsgs.length > 0
                      ? storeMsgs
                      : (messagesSnapshot as UIMessage[]) || [];
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
                        `[acb][useAIChat] failed to fetch auto title for thread "${effectiveId}"`,
                        error,
                        showErrorMessages
                      );
                    });
                }
              }
            } catch (error) {
              logDevError(
                `[acb][useAIChat] failed to apply auto-title logic for thread "${effectiveId}"`,
                error,
                showErrorMessages
              );
            }
          }
        } catch (error) {
          logDevError(
            "[acb][useAIChat] failed to persist messages after completion",
            error,
            showErrorMessages
          );
        }
      }
    },
    onError: (error) => {
      logDevError(
        "[acb][useAIChat] Chat error occurred",
        error ?? new Error("Unknown chat error"),
        showErrorMessages
      );
      setError("Chat error occurred");
    },
  });

  useEffect(() => {
    const latest = chatHookRef.current;
    if (!latest) return;
    const { messages: normalized, changed } = normalizeMessagesMetadata(
      latest.messages
    );
    if (changed) {
      if (showErrorMessages) {
        console.log('[acb][useAIChat] Normalizing message metadata');
      }
      latest.setMessages(normalized);
    }
  }, [chatHook.messages, showErrorMessages]);

  const baseCompressionActions = baseCompressionController.actions;

  const getLatestChat = useCallback(
    () => chatHookRef.current ?? chatHook,
    [chatHook]
  );

  const resetErrorState = useCallback(() => {
    setError(null);
    try {
      getLatestChat().clearError();
    } catch (error) {
      logDevError(
        "[acb][useAIChat] failed to clear chat error state",
        error,
        showErrorMessages
      );
    }
  }, [getLatestChat, setError, showErrorMessages]);

  const mutateMessageById = useCallback(
    (
      messageId: string,
      updater: (message: UIMessage) => UIMessage
    ): UIMessage | undefined => {
      if (!messageId) return undefined;
      const latestHook = getLatestChat();
      const currentMessages = latestHook.messages as UIMessage[];
      const targetIndex = currentMessages.findIndex(
        (message) => message?.id === messageId
      );
      if (targetIndex === -1) return undefined;

      const currentMessage = currentMessages[targetIndex];
      const updated = updater(currentMessage);
      if (!updated || updated === currentMessage) {
        return currentMessage;
      }

      const nextMessages = currentMessages.slice();
      nextMessages[targetIndex] = updated;
      latestHook.setMessages(nextMessages);
      return updated;
    },
    [getLatestChat]
  );

  const applyPinnedStateToMessage = useCallback(
    (message: UIMessage, pinned: CompressionMessagePinnedState | null) => {
      if (!message?.id) {
        return withCompressionPinnedState(message, pinned);
      }
      const updated = mutateMessageById(message.id, (current) =>
        withCompressionPinnedState(current, pinned)
      );
      return updated ?? withCompressionPinnedState(message, pinned);
    },
    [mutateMessageById]
  );

  const enhancedPinMessage = useCallback(
    (
      message: UIMessage,
      options?: Parameters<typeof baseCompressionActions.pinMessage>[1]
    ) => {
      const pinnedAt = options?.pinnedAt ?? Date.now();
      const pinnedState: CompressionMessagePinnedState = {
        pinnedAt,
        pinnedBy: options?.pinnedBy,
        reason: options?.reason,
      };

      const updatedMessage = applyPinnedStateToMessage(message, pinnedState);

      baseCompressionActions.pinMessage(updatedMessage, {
        ...options,
        pinnedAt,
      });
    },
    [applyPinnedStateToMessage, baseCompressionActions]
  );

  const enhancedUnpinMessage = useCallback(
    (messageId: string) => {
      if (messageId) {
        mutateMessageById(messageId, (current) =>
          withCompressionPinnedState(current, null)
        );
      }
      baseCompressionActions.unpinMessage(messageId);
    },
    [mutateMessageById, baseCompressionActions]
  );

  const enhancedSetPinnedMessages = useCallback(
    (pins: CompressionPinnedMessage[]) => {
      baseCompressionActions.setPinnedMessages(pins);

      const targetStates = new Map<string, CompressionMessagePinnedState>();
      pins.forEach((pin) => {
        const id = pin.message?.id ?? pin.id;
        if (!id) return;
        const pinnedAt =
          typeof pin.pinnedAt === "number" && Number.isFinite(pin.pinnedAt)
            ? pin.pinnedAt
            : Date.now();
        targetStates.set(id, {
          pinnedAt,
          pinnedBy: pin.pinnedBy,
          reason: pin.reason,
        });
      });

      const latestHook = getLatestChat();
      const currentMessages = latestHook.messages as UIMessage[];
      let changed = false;
      const nextMessages = currentMessages.map((current) => {
        if (!current?.id) return current;
        const nextState = targetStates.get(current.id) ?? null;
        const updated = withCompressionPinnedState(current, nextState);
        if (updated !== current) {
          changed = true;
          return updated;
        }
        return current;
      });

      if (changed) {
        latestHook.setMessages(nextMessages);
      }
    },
    [baseCompressionActions, getLatestChat]
  );

  const enhancedClearPinnedMessages = useCallback(() => {
    baseCompressionActions.clearPinnedMessages();

    const latestHook = getLatestChat();
    const currentMessages = latestHook.messages as UIMessage[];
    let changed = false;
    const nextMessages = currentMessages.map((current) => {
      const updated = withCompressionPinnedState(current, null);
      if (updated !== current) {
        changed = true;
        return updated;
      }
      return current;
    });

    if (changed) {
      latestHook.setMessages(nextMessages);
    }
  }, [baseCompressionActions, getLatestChat]);

  const compressionActions = useMemo(
    () => ({
      ...baseCompressionActions,
      pinMessage: enhancedPinMessage,
      setPinnedMessages: enhancedSetPinnedMessages,
      unpinMessage: enhancedUnpinMessage,
      clearPinnedMessages: enhancedClearPinnedMessages,
    }),
    [
      baseCompressionActions,
      enhancedClearPinnedMessages,
      enhancedPinMessage,
      enhancedSetPinnedMessages,
      enhancedUnpinMessage,
    ]
  );

  const runCompression = useCallback(
    async (
      options?: CompressionRunOptions
    ): Promise<BuildCompressionPayloadResult> => {
      const latestHook = getLatestChat();
      const baseMessages = (latestHook.messages as UIMessage[]) ?? [];
      return buildCompressionRequestPayload(baseMessages, options);
    },
    [buildCompressionRequestPayload, getLatestChat]
  );

  const compressionController = useMemo(
    () => ({
      ...baseCompressionController,
      actions: compressionActions,
      runCompression,
    }),
    [baseCompressionController, compressionActions, runCompression]
  );

  const lastPersistedCompressionRef = useRef<PersistedCompressionState | null>(
    null
  );
  const lastHydratedCompressionRef = useRef<PersistedCompressionState | null>(
    null
  );

  useEffect(() => {
    const store = useAICompressionStore.getState();

    if (!resolvedCompressionOptions?.enabled) {
      if (store.listPinnedMessages().length > 0) {
        store.clearPinnedMessages();
      }
      return;
    }

    const metadataPins = extractPinnedMessagesFromMetadata(
      (chatHook.messages as UIMessage[]) ?? []
    );
    const existingPins = store.listPinnedMessages();

    if (existingPins.length === metadataPins.length) {
      const byId = new Map(metadataPins.map((pin) => [pin.id, pin]));
      const unchanged = existingPins.every((pin) => {
        const candidate = byId.get(pin.id);
        return (
          !!candidate &&
          candidate.pinnedAt === pin.pinnedAt &&
          candidate.pinnedBy === pin.pinnedBy &&
          candidate.reason === pin.reason
        );
      });

      if (unchanged) {
        return;
      }
    }

    store.setPinnedMessages(metadataPins);
  }, [resolvedCompressionOptions?.enabled, chatHook.messages]);

  useEffect(() => {
    if (!compressionConfig.enabled) {
      lastHydratedCompressionRef.current = null;
      return;
    }

    const effectiveThreadId = threadId ?? storeActiveThreadId;
    if (!effectiveThreadId) return;

    const state = threadStore.getState();
    const record = state.getRecord(effectiveThreadId);
    if (!record) return;

    const rawPersisted = record.metadata
      ? (record.metadata[COMPRESSION_THREAD_METADATA_KEY] as
          | PersistedCompressionState
          | null
          | undefined)
      : undefined;
    const persisted = clonePersistedCompressionState(rawPersisted ?? null);

    if (isEqual(lastHydratedCompressionRef.current, persisted)) {
      return;
    }

    lastHydratedCompressionRef.current =
      clonePersistedCompressionState(persisted);

    const compressionStore = useAICompressionStore.getState();

    if (!persisted) {
      compressionStore.setSnapshot(null);
      compressionStore.setArtifacts([]);
      compressionStore.setUsage(null, {
        shouldCompress: false,
        overBudget: false,
      });
      compressionStore.setModelMetadata(null);

      const cleared = applyCompressionMetadataToMessages(
        (chatHook.messages as UIMessage[]) ?? [],
        null
      );

      if (cleared.changed) {
        chatHook.setMessages(cleared.messages);
      }
      return;
    }

    compressionStore.setSnapshot(persisted.snapshot);
    compressionStore.setArtifacts(persisted.artifacts);
    compressionStore.setUsage(persisted.usage, {
      shouldCompress: persisted.shouldCompress,
      overBudget: persisted.overBudget,
    });
    compressionStore.setModelMetadata(persisted.metadata);

    const applied = applyCompressionMetadataToMessages(
      (chatHook.messages as UIMessage[]) ?? [],
      persisted.snapshot
    );

    let nextMessages = applied.messages;
    let changed = applied.changed;

    if (persisted.snapshot) {
      const ensured = ensureCompressionEventMessage(nextMessages, {
        snapshot: persisted.snapshot,
        artifacts: persisted.artifacts,
        usage: persisted.usage,
      });

      if (ensured.changed) {
        nextMessages = ensured.messages;
        changed = true;
      }
    }

    if (changed) {
      chatHook.setMessages(nextMessages);
    }
  }, [
    chatHook,
    chatHook.messages,
    compressionConfig.enabled,
    storeActiveThreadId,
    threadId,
    threadStore,
  ]);

  const compressionBaseMessages = useMemo(
    () => (chatHook.messages as UIMessage[]) ?? [],
    [chatHook.messages]
  );

  const compressionUsageSignature = useMemo(() => {
    if (!compressionConfig.enabled) return null;
    if (compressionBaseMessages.length === 0) return "__empty__";

    return compressionBaseMessages
      .map((message, index) => {
        const idPart = message.id ?? `idx-${index}`;
        const rolePart = message.role ?? "unknown";
        const partCount = Array.isArray(message.parts)
          ? message.parts.length
          : 0;
        return `${idPart}:${rolePart}:${partCount}`;
      })
      .join("|");
  }, [compressionConfig.enabled, compressionBaseMessages]);

  useEffect(() => {
    const store = useAICompressionStore.getState();

    if (!compressionConfig.enabled) {
      if (store.usage || store.shouldCompress || store.overBudget) {
        store.setUsage(null, { shouldCompress: false, overBudget: false });
      }
      return;
    }

    if (compressionUsageSignature === null) {
      return;
    }

    const snapshot = store.getSnapshot();
    const result = buildCompressionPayload({
      baseMessages: compressionBaseMessages,
      pinnedMessages: snapshot.pinnedMessages,
      artifacts: snapshot.artifacts,
      snapshot: snapshot.snapshot,
      config: compressionConfig,
    });

    const usageChanged = hasMeaningfulUsageChange(store.usage, result.usage);
    const shouldCompressChanged =
      store.shouldCompress !== result.shouldCompress;
    const overBudgetChanged = store.overBudget !== result.overBudget;

    if (!usageChanged && !shouldCompressChanged && !overBudgetChanged) {
      return;
    }

    store.setUsage(result.usage, {
      shouldCompress: result.shouldCompress,
      overBudget: result.overBudget,
    });
  }, [
    compressionConfig,
    compressionUsageSignature,
    compressionBaseMessages,
    compressionController.pinnedMessages,
    compressionController.artifacts,
    compressionController.snapshot,
  ]);

  useEffect(() => {
    const effectiveThreadId = threadId ?? storeActiveThreadId;

    if (!compressionConfig.enabled) {
      const cleared = applyCompressionMetadataToMessages(
        (chatHook.messages as UIMessage[]) ?? [],
        null
      );
      if (cleared.changed) {
        chatHook.setMessages(cleared.messages);
        if (effectiveThreadId) {
          try {
            threadStore
              .getState()
              .updateThreadMessages(effectiveThreadId, cleared.messages);
          } catch (error) {
            logDevError(
              `[acb][useAIChat] failed to persist cleared compression messages for thread "${effectiveThreadId}"`,
              error,
              showErrorMessages
            );
          }
        }
      }

      if (effectiveThreadId) {
        try {
          threadStore.getState().updateThreadMetadata(effectiveThreadId, {
            [COMPRESSION_THREAD_METADATA_KEY]: null,
          });
        } catch (error) {
          logDevError(
            `[acb][useAIChat] failed to clear compression metadata for thread "${effectiveThreadId}"`,
            error,
            showErrorMessages
          );
        }
      }

      lastPersistedCompressionRef.current = null;
      lastHydratedCompressionRef.current = null;
      return;
    }

    const persisted = buildPersistedCompressionState(compressionController);

    if (isEqual(lastPersistedCompressionRef.current, persisted)) {
      return;
    }

    const normalizedPersisted = clonePersistedCompressionState(persisted);
    lastPersistedCompressionRef.current =
      clonePersistedCompressionState(normalizedPersisted);

    let nextMessages = (chatHook.messages as UIMessage[]) ?? [];
    let changed = false;

    const applied = applyCompressionMetadataToMessages(
      nextMessages,
      normalizedPersisted?.snapshot ?? null
    );

    nextMessages = applied.messages;
    changed = applied.changed;

    if (normalizedPersisted?.snapshot) {
      const ensured = ensureCompressionEventMessage(nextMessages, {
        snapshot: normalizedPersisted.snapshot,
        artifacts: normalizedPersisted.artifacts,
        usage: normalizedPersisted.usage,
      });
      if (ensured.changed) {
        nextMessages = ensured.messages;
        changed = true;
      }
    }

    if (changed) {
      chatHook.setMessages(nextMessages);
      if (effectiveThreadId) {
        try {
          threadStore
            .getState()
            .updateThreadMessages(effectiveThreadId, nextMessages);
        } catch (error) {
          logDevError(
            `[acb][useAIChat] failed to persist compression-updated messages for thread "${effectiveThreadId}"`,
            error,
            showErrorMessages
          );
        }
      }
    }

    if (effectiveThreadId) {
      try {
        threadStore.getState().updateThreadMetadata(effectiveThreadId, {
          [COMPRESSION_THREAD_METADATA_KEY]: normalizedPersisted,
        });
        lastHydratedCompressionRef.current =
          clonePersistedCompressionState(normalizedPersisted);
      } catch (error) {
        logDevError(
          `[acb][useAIChat] failed to persist compression metadata for thread "${effectiveThreadId}"`,
          error,
          showErrorMessages
        );
      }
    }
  }, [
    chatHook,
    chatHook.messages,
    compressionConfig.enabled,
    compressionController,
    compressionController.artifacts,
    compressionController.metadata,
    compressionController.overBudget,
    compressionController.shouldCompress,
    compressionController.snapshot,
    compressionController.usage,
    storeActiveThreadId,
    threadId,
    threadStore,
    showErrorMessages,
  ]);

  // Capture messages snapshot BEFORE they might get cleared
  const messagesSnapshotRef = useRef<UIMessage[]>([]);
  useEffect(() => {
    if (chatHook.messages.length > 0) {
      messagesSnapshotRef.current = chatHook.messages;
    }
  }, [chatHook.messages]);

  // Update ref to latest chatHook for stable callback access
  useEffect(() => {
    chatHookRef.current = chatHook;
  }, [chatHook]);

  // Keep track of last thread id AND per-thread input drafts
  const lastThreadIdRef = useRef<string | undefined>(undefined);
  const isSyncingThreadRef = useRef(false);
  useEffect(() => {
    if (!threadStore) return;
    const effectiveId = threadId ?? storeActiveThreadId;
    if (effectiveId === lastThreadIdRef.current) return;

    // Prevent concurrent thread switches
    if (isSyncingThreadRef.current) {
      if (showErrorMessages) {
        console.warn('[acb][useAIChat] Skipping thread switch - already syncing');
      }
      return;
    }

    isSyncingThreadRef.current = true;
    const prev = lastThreadIdRef.current;

    // DON'T update lastThreadIdRef yet - do it after messages are cleared
    // Otherwise persistence will run with old messages + new thread ID

    // Only reset signature tracking when switching between real threads
    // Don't reset when initializing (prev was undefined) or staying on same thread
    if (prev && prev !== effectiveId) {
      lastSavedSignatureRef.current = undefined;
    }

    if (showErrorMessages) {
      console.log(`[acb][useAIChat] Thread switch: ${prev?.slice(0,8)} → ${effectiveId?.slice(0,8)}`);
      console.log(`  Current chatHook.messages.length=${chatHook.messages.length}`);
    }

    // Unload previous (optional optimization)
    if (prev) {
      try {
        const st = threadStore.getState();
        // Keep it loaded if we might come back? For now, unload to save memory.
        st.unloadTimeline(prev);
      } catch (error) {
        logDevError(
          `[acb][useAIChat] failed to unload thread "${prev}"`,
          error,
          showErrorMessages
        );
      }
    }
    if (effectiveId) {
      // Ensure loaded
      try {
        const st = threadStore.getState();
        const existingTimeline = st.getTimeline(effectiveId);
        if (!existingTimeline) {
          st.ensureTimeline(effectiveId)
            .then((timeline) => {
              // Verify we're still on this thread (user might have switched again)
              if (lastThreadIdRef.current !== effectiveId) {
                if (showErrorMessages) {
                  console.log(`[acb][useAIChat] Skipping load - thread changed during async load`);
                }
                isSyncingThreadRef.current = false;
                return;
              }
              if (!timeline) {
                if (showErrorMessages) {
                  console.log(`[acb][useAIChat] No timeline from ensureTimeline - new thread with no messages`);
                }
                // New thread with no persisted messages - clear the chat
                const latest = chatHookRef.current;
                if (latest && latest.messages.length > 0) {
                  if (showErrorMessages) {
                    console.log(`[acb][useAIChat] Clearing ${latest.messages.length} messages for new thread`);
                  }
                  latest.setMessages([]);
                }
                // Now it's safe to update the ref
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
                  console.log(`[acb][useAIChat] Loading ${storeMsgs.length} messages for thread ${effectiveId?.slice(0,8)}`);
                }
                latest.setMessages(storeMsgs);
              } else {
                if (showErrorMessages) {
                  console.log(`[acb][useAIChat] Messages already match (${existing.length} msgs)`);
                }
              }
              // Now it's safe to update the ref
              lastThreadIdRef.current = effectiveId;
              isSyncingThreadRef.current = false;
            })
            .catch((error) => {
              logDevError(
                `[acb][useAIChat] failed to hydrate thread "${effectiveId}"`,
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
              console.log(`[acb][useAIChat] Loading ${storeMsgs.length} messages for thread ${effectiveId?.slice(0,8)}`);
            }
            latest.setMessages(storeMsgs);
          } else {
            if (showErrorMessages) {
              console.log(`[acb][useAIChat] Messages already match (${existing.length} msgs)`);
            }
          }
          // Now it's safe to update the ref
          lastThreadIdRef.current = effectiveId;
          isSyncingThreadRef.current = false;
        }
      } catch (error) {
        logDevError(
          `[acb][useAIChat] failed to access thread state for "${effectiveId}"`,
          error,
          showErrorMessages
        );
        isSyncingThreadRef.current = false;
      }
    } else {
      // no active thread - only clear if we actually had messages before
      const latest = chatHookRef.current;
      if (latest && latest.messages.length > 0) {
        if (showErrorMessages) {
          console.log(`[acb][useAIChat] Clearing messages - no active thread`);
        }
        latest.setMessages([]);
      }
      isSyncingThreadRef.current = false;
    }
  }, [threadId, storeActiveThreadId, threadStore, showErrorMessages]);

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
    } catch (error) {
      logDevError(
        `[acb][useAIChat] failed to append tool result for "${toolCall.toolName}"`,
        error,
        showErrorMessages
      );
    }
  }

  const sendMessageWithContext = useCallback(
    (content: string) => {
      resetErrorState();
      const timestamp = Date.now();

      // Capture message count BEFORE sending
      const beforeCount = chatHookRef.current?.messages.length || 0;

      chatHookRef.current?.sendMessage({
        text: content,
        metadata: { timestamp },
      });
      if (threadStore) {
        // Wait for React to process the message addition
        // queueMicrotask is too early - use setTimeout to wait for state updates
        setTimeout(() => {
          try {
            const state = threadStore.getState();
            const effectiveId = threadId ?? state.activeThreadId;
            if (effectiveId) {
              const afterCount = chatHookRef.current?.messages.length || 0;

              // Force persist if count increased (new message added)
              if (afterCount > beforeCount) {
                // Directly update store with new messages
                state.updateThreadMessages(effectiveId, chatHookRef.current?.messages as UIMessage[]);
              }
              // Initial placeholder title: first user message preview if untitled
              const refreshed = threadStore.getState();
              const record = refreshed.getRecord(effectiveId);
              if (
                record &&
                (!record.title || hasAutoTitledFlag(record.metadata))
              ) {
                if (!record.title) {
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
                      refreshed.renameThread(effectiveId, preview, {
                        allowAutoReplace: true,
                      });
                    }
                  }
                }
              }
            }
          } catch (error) {
            logDevError(
              "[acb][useAIChat] failed to persist thread state after sending message",
              error,
              showErrorMessages
            );
          }
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [threadId, resetErrorState, threadStore]
    // persistMessagesIfChanged is stable via useCallback and called in microtask
  );

  const handleSuggestionSend = useCallback(
    (suggestion: Suggestion) => {
      if (!suggestion?.longSuggestion) return;
      sendMessageWithContext(suggestion.longSuggestion);
    },
    [sendMessageWithContext]
  );

  // Send AI command message with specific tool filtering
  const sendAICommandMessage = useCallback(
    (content: string, toolName: string, commandSystemPrompt?: string) => {
      resetErrorState();

      // Filter tools to only include the specified tool (per-call override via body)
      const allTools = useAIToolsStore.getState().serializeToolsForBackend();
      const filteredTools = allTools.filter((tool) => tool.name === toolName);

      // Send message with per-call overrides; transport will pick these up in prepareSendMessagesRequest
      const timestamp = Date.now();
      chatHookRef.current?.sendMessage(
        { text: content, metadata: { timestamp } },
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
            if (effectiveId) {
              state.updateThreadMessages(
                effectiveId,
                chatHookRef.current?.messages as UIMessage[]
              );
            }
          } catch (error) {
            logDevError(
              "[acb][useAIChat] failed to persist thread state after command message",
              error,
              showErrorMessages
            );
          }
        });
      }
    },
    [threadId, resetErrorState, threadStore, showErrorMessages]
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
  const clearError = useCallback(() => {
    resetErrorState();
  }, [resetErrorState]);

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
      const effectiveId =
        threadId ??
        (() => {
          try {
            return threadStore.getState().activeThreadId;
          } catch (error) {
            logDevError(
              "[acb][useAIChat] failed to read active thread id during persistence",
              error,
              showErrorMessages
            );
            return undefined;
          }
        })();

      if (!effectiveId) return;

      // Don't persist during thread switches to avoid race conditions
      if (isSyncingThreadRef.current) return;

      // Verify we're persisting for the correct thread
      // Allow if lastThreadIdRef is undefined (initial load) AND we have an effectiveId
      if (lastThreadIdRef.current !== undefined && effectiveId !== lastThreadIdRef.current) {
        if (showErrorMessages) {
          console.warn(`[acb][useAIChat] Skipping persistence - thread mismatch`);
        }
        return;
      }

      // If this is first persistence for this thread, set the ref now
      if (lastThreadIdRef.current === undefined && effectiveId) {
        lastThreadIdRef.current = effectiveId;
      }

      try {
        const store = threadStore.getState();
        const timeline = store.getTimeline(effectiveId);
        const storeMessages = (timeline?.messages ?? []) as UIMessage[];
        const helper = chatHookRef.current ?? chatHook;
        const candidateMessages = (helper?.messages ?? []) as UIMessage[];
        const existingRecord = store.getRecord(effectiveId);

        // Never persist empty messages if we had messages before
        if (candidateMessages.length === 0 && storeMessages.length > 0) {
          if (showErrorMessages) {
            console.warn('[acb][useAIChat] Skipping persistence: candidate empty but store has messages');
          }
          return;
        }

        // Never persist if BOTH sources are empty and this thread already exists with messages
        if (candidateMessages.length === 0 && storeMessages.length === 0) {
          if (existingRecord && existingRecord.messageCount > 0) {
            if (showErrorMessages) {
              console.warn(`[acb][useAIChat] Skipping persistence: both sources empty but record has ${existingRecord.messageCount} messages`);
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
          // Same length but content differs - prefer the candidate snapshot to capture latest edits
          msgs = candidateMessages;
          signature = candidateSignature;
        } else {
          msgs = storeMessages;
          signature = storeSignature;
        }

        if (signature === lastSavedSignatureRef.current) {
          return; // Already saved
        }

        store.updateThreadMessages(effectiveId, msgs);
        lastSavedSignatureRef.current = signature;
      } catch (error) {
        logDevError(
          `[acb][useAIChat] failed to persist messages for thread "${effectiveId}"`,
          error,
          showErrorMessages
        );
      }
    },
    [threadId, threadStore, showErrorMessages]
    // Note: chatHook intentionally excluded - we use chatHookRef instead
    // Including chatHook would cause this to recreate on every render (e.g., when typing in input)
  );

  const branching = useAIChatBranching({
    enabled: branchingEnabled,
    chatHook,
    chatHookRef,
    persistMessagesIfChanged,
  });

  const deferredSuggestionMessages = useDeferredValue(chatHook.messages);
  const {
    suggestions: suggestionItems,
    isLoading: suggestionsLoading,
    error: suggestionsError,
    fetchSuggestions,
    clearSuggestions,
    handleSuggestionClick: baseHandleSuggestionClick,
    onAssistantFinish,
  } = useSuggestions({
    enabled: suggestionsEnabled,
    prompt: suggestionsConfig?.prompt,
    messages: deferredSuggestionMessages,
    onSuggestionClick: handleSuggestionSend,
    strategy: suggestionsConfig?.strategy,
    debounceMs: suggestionsConfig?.debounceMs,
    numSuggestions: suggestionsConfig?.count,
    api: suggestionsConfig?.api,
    fetcher: suggestionsConfig?.fetcher,
  });

  useEffect(() => {
    suggestionsFinishRef.current = suggestionsEnabled
      ? onAssistantFinish
      : null;
  }, [suggestionsEnabled, onAssistantFinish]);

  // Persist whenever messages settle and we are idle (not streaming/submitting)
  useEffect(() => {
    const effectiveId = threadId ?? storeActiveThreadId;
    if (!effectiveId) return;
    if (chatHook.status === "streaming" || chatHook.status === "submitted") {
      return; // Skip during active chat operations
    }
    persistMessagesIfChanged("idle");
  }, [
    threadId,
    storeActiveThreadId,
    chatHook.status,
    // Note: chatHook.messages intentionally excluded to prevent race conditions
    // during rapid state transitions when assistant finishes. persistMessagesIfChanged
    // gets latest messages via chatHookRef.current which is always up-to-date.
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
    regenerate: branching.regenerate,
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
    compression: compressionController,
    branching: branching.enabled
      ? ({
          enabled: true as const,
          selectBranch: branching.selectBranch,
        } as const)
      : ({ enabled: false as const } as const),
    suggestions: {
      enabled: suggestionsEnabled,
      items: suggestionItems,
      count: suggestionCount,
      isLoading: suggestionsLoading,
      error: suggestionsError,
      handleSuggestionClick: baseHandleSuggestionClick,
      fetchSuggestions,
      clearSuggestions,
    },
    isRestoringThread,
  };
}
