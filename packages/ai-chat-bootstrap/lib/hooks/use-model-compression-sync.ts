import { useEffect, useMemo, useRef, useCallback } from "react";
import type { UIMessage } from "ai";
import isEqual from "fast-deep-equal";
import { useShallow } from "zustand/react/shallow";
import { useAIModelsStore, useAICompressionStore, useChatThreadsStore } from "../stores";
import type { ChatModelOption } from "../types/chat";
import {
  COMPRESSION_THREAD_METADATA_KEY,
  type CompressionConfig,
  type CompressionUsage,
  type PersistedCompressionState,
  type CompressionController,
  type NormalizedCompressionConfig,
} from "../types/compression";
import { buildCompressionPayload } from "../utils/compression/build-payload";
import {
  applyCompressionMetadataToMessages,
  ensureCompressionEventMessage,
  extractPinnedMessagesFromMetadata,
} from "../utils/compression/message-metadata";
import {
  buildPersistedCompressionState,
  clonePersistedCompressionState,
} from "../utils/compression/persistence";
import { logDevError } from "../utils/dev-logger";

const EMPTY_MODEL_OPTIONS: ChatModelOption[] = [];

function isMetadataObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

export interface UseModelCompressionSyncOptions {
  incomingModels?: ChatModelOption[];
  providedModel?: string;
  compressionOptions?: CompressionConfig;
  compressionEnabled: boolean;
  getChatMessages: () => UIMessage[];
  setChatMessages: (messages: UIMessage[]) => void;
  threadId?: string;
  compressionController: CompressionController;
  compressionConfig: NormalizedCompressionConfig;
  showErrorMessages?: boolean;
}

/**
 * Hook to manage model selection and coordinate compression state synchronization.
 * Handles:
 * - Model selection and validation
 * - Compression config resolution with model defaults
 * - Compression state hydration from thread metadata
 * - Compression state persistence to thread metadata
 * - Usage tracking and budget monitoring
 */
export function useModelCompressionSync({
  incomingModels = EMPTY_MODEL_OPTIONS,
  providedModel,
  compressionOptions,
  compressionEnabled,
  getChatMessages,
  setChatMessages,
  threadId,
  compressionController,
  compressionConfig,
  showErrorMessages = false,
}: UseModelCompressionSyncOptions) {
  const { models, selectedModelId } = useAIModelsStore(
    useShallow((state) => ({
      models: state.models,
      selectedModelId: state.selectedModelId,
    }))
  );
  const setModelsInStore = useAIModelsStore((state) => state.setModels);
  const storeActiveThreadId = useChatThreadsStore(
    (state) => state.activeThreadId
  );
  const threadStore = useChatThreadsStore;

  // Subscribe to thread's message signature for reactivity to message changes
  const effectiveThreadId = threadId ?? storeActiveThreadId;
  const threadRecord = useChatThreadsStore((state) =>
    effectiveThreadId ? state.getRecord(effectiveThreadId) : undefined
  );
  const threadMessagesSignature = threadRecord?.messageSignature ?? "";

  // Validate compression config if enabled
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
        `[acb][useModelCompressionSync] compression is enabled but the following models are missing a valid contextWindowTokens value: ${missingIds}`
      );
    }
  }

  // Get active model
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

  // Resolve compression options with model defaults
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

  // Compute compression model metadata
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

  // Sync models to store when they change
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

  // Sync compression model metadata
  useEffect(() => {
    const setCompressionModelMetadata =
      compressionController.actions.setModelMetadata;
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
  }, [compressionModelMetadata, compressionController.actions]);

  const setModel = useCallback((modelId: string) => {
    useAIModelsStore.getState().setSelectedModelId(modelId);
  }, []);

  // Sync pinned messages from message metadata to compression store
  useEffect(() => {
    const store = useAICompressionStore.getState();

    if (!resolvedCompressionOptions?.enabled) {
      if (store.listPinnedMessages().length > 0) {
        store.clearPinnedMessages();
      }
      return;
    }

    const metadataPins = extractPinnedMessagesFromMetadata(
      (getChatMessages() as UIMessage[]) ?? []
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
  }, [resolvedCompressionOptions?.enabled, getChatMessages]);

  // Hydrate compression state from thread metadata
  const lastHydratedCompressionRef = useRef<PersistedCompressionState | null>(
    null
  );

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
        (getChatMessages() as UIMessage[]) ?? [],
        null
      );

      if (cleared.changed) {
        setChatMessages(cleared.messages);
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
      (getChatMessages() as UIMessage[]) ?? [],
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
      setChatMessages(nextMessages);
    }
  }, [
    getChatMessages,
    compressionConfig.enabled,
    storeActiveThreadId,
    threadId,
    threadStore,
    setChatMessages,
  ]);

  // Compute usage based on current messages and compression state
  // Signature calculation depends on thread store's messageSignature for reactivity
  const compressionUsageSignature = useMemo(() => {
    if (!compressionConfig.enabled) return null;

    // Call getChatMessages() fresh to get current messages
    const messages = (getChatMessages() as UIMessage[]) ?? [];
    if (messages.length === 0) return "__empty__";

    return messages
      .map((message, index) => {
        const idPart = message.id ?? `idx-${index}`;
        const rolePart = message.role ?? "unknown";
        const partCount = Array.isArray(message.parts)
          ? message.parts.length
          : 0;
        return `${idPart}:${rolePart}:${partCount}`;
      })
      .join("|");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compressionConfig.enabled, getChatMessages, threadMessagesSignature]);

  useEffect(() => {
    const store = useAICompressionStore.getState();

    // Get fresh messages on each effect run
    const baseMessages = (getChatMessages() as UIMessage[]) ?? [];

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

    // Use compressionConfig but with maxTokenBudget from resolvedCompressionOptions if available
    const effectiveConfig: NormalizedCompressionConfig = {
      ...compressionConfig,
      maxTokenBudget: resolvedCompressionOptions?.maxTokenBudget ?? compressionConfig.maxTokenBudget,
      compressionThreshold: resolvedCompressionOptions?.compressionThreshold ?? compressionConfig.compressionThreshold,
    };

    const result = buildCompressionPayload({
      baseMessages,
      pinnedMessages: snapshot.pinnedMessages,
      artifacts: snapshot.artifacts,
      snapshot: snapshot.snapshot,
      config: effectiveConfig,
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
    resolvedCompressionOptions,
    compressionConfig,
    compressionUsageSignature,
    threadMessagesSignature,
    compressionController.pinnedMessages,
    compressionController.artifacts,
    compressionController.snapshot,
    getChatMessages,
  ]);

  // Persist compression state to thread metadata
  const lastPersistedCompressionRef = useRef<PersistedCompressionState | null>(
    null
  );

  useEffect(() => {
    const effectiveThreadId = threadId ?? storeActiveThreadId;

    if (!compressionConfig.enabled) {
      const cleared = applyCompressionMetadataToMessages(
        (getChatMessages() as UIMessage[]) ?? [],
        null
      );
      if (cleared.changed) {
        setChatMessages(cleared.messages);
        if (effectiveThreadId) {
          try {
            threadStore
              .getState()
              .updateThreadMessages(effectiveThreadId, cleared.messages);
          } catch (error) {
            logDevError(
              `[acb][useModelCompressionSync] failed to persist cleared compression messages for thread "${effectiveThreadId}"`,
              error,
              showErrorMessages
            );
          }
        }
      }

      if (effectiveThreadId) {
        try {
          const state = threadStore.getState();
          const record = state.records.get(effectiveThreadId);
          const metadata = record?.metadata;
          let existingValue: unknown;

          if (isMetadataObject(metadata)) {
            existingValue = metadata[COMPRESSION_THREAD_METADATA_KEY];
          }

          if (existingValue !== null && existingValue !== undefined) {
            state.updateThreadMetadata(effectiveThreadId, {
              [COMPRESSION_THREAD_METADATA_KEY]: null,
            });
          }
        } catch (error) {
          logDevError(
            `[acb][useModelCompressionSync] failed to clear compression metadata for thread "${effectiveThreadId}"`,
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

    let nextMessages = (getChatMessages() as UIMessage[]) ?? [];
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
      setChatMessages(nextMessages);
      if (effectiveThreadId) {
        try {
          threadStore
            .getState()
            .updateThreadMessages(effectiveThreadId, nextMessages);
        } catch (error) {
          logDevError(
            `[acb][useModelCompressionSync] failed to persist compression-updated messages for thread "${effectiveThreadId}"`,
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
          `[acb][useModelCompressionSync] failed to persist compression metadata for thread "${effectiveThreadId}"`,
          error,
          showErrorMessages
        );
      }
    }
  }, [
    getChatMessages,
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
    setChatMessages,
    showErrorMessages,
  ]);

  return {
    models,
    selectedModelId,
    setModel,
    activeModel,
    resolvedCompressionOptions,
  };
}
