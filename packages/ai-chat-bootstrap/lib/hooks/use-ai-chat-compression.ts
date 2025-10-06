import { useCallback, useEffect, useMemo, useRef } from "react";
import type { UIMessage } from "ai";
import { useAICompressionStore } from "../stores";
import type {
  CompressionArtifact,
  CompressionConfig,
  CompressionErrorEvent,
  CompressionEvent,
  CompressionPinnedMessage,
  CompressionServiceRequest,
  CompressionSnapshot,
  CompressionTriggerReason,
  CompressionUsage,
  CompressionRunOptions,
  BuildCompressionPayloadResult,
  NormalizedCompressionConfig,
} from "../types/compression";
import { normalizeCompressionConfig } from "../types/compression";
import { buildCompressionPayload } from "../utils/compression/build-payload";
import { useCompressionController } from "./use-compression-controller";
import {
  CompressionServiceError,
  fetchCompressionService,
} from "../services/compression-service";

export interface UseAIChatCompressionOptions {
  compression?: CompressionConfig;
}

export interface AIChatCompressionHelpers {
  config: NormalizedCompressionConfig;
  controller: ReturnType<typeof useCompressionController>;
  buildPayload: (
    baseMessages: UIMessage[],
    options?: CompressionRunOptions
  ) => Promise<BuildCompressionPayloadResult>;
}

export function useAIChatCompression(
  options: UseAIChatCompressionOptions = {}
): AIChatCompressionHelpers {
  const { compression } = options;
  const normalizedCompression = useMemo(
    () => normalizeCompressionConfig(compression),
    [compression]
  );

  const configRef = useRef<NormalizedCompressionConfig>(normalizedCompression);

  useEffect(() => {
    configRef.current = normalizedCompression;
    useAICompressionStore.getState().setConfig(normalizedCompression);
  }, [normalizedCompression]);

  const controller = useCompressionController();

  const buildPayload = useCallback(
    async (
      baseMessages: UIMessage[],
      options: CompressionRunOptions = {}
    ) => {
      const store = useAICompressionStore.getState();
      const currentConfig = configRef.current;
      const { force = false, reason: providedReason } = options ?? {};

    const storeSnapshot = store.getSnapshot();
    const baselineArtifactIds = new Set(
      storeSnapshot.artifacts.map((artifact) => artifact.id)
    );

    const initialResult = buildCompressionPayload({
      baseMessages,
      pinnedMessages: storeSnapshot.pinnedMessages,
      artifacts: storeSnapshot.artifacts,
      snapshot: storeSnapshot.snapshot,
      config: currentConfig,
    });

    const effectiveShouldCompress = force ? true : initialResult.shouldCompress;

    store.setUsage(initialResult.usage, {
      shouldCompress: effectiveShouldCompress,
      overBudget: initialResult.overBudget,
    });

    const canCompress =
      currentConfig.enabled &&
      (initialResult.shouldCompress || force === true);

    if (!canCompress) {
      return initialResult;
    }

    const reason: CompressionTriggerReason =
      providedReason ??
      (force
        ? "manual"
        : initialResult.overBudget
          ? "over-budget"
          : "threshold");
    const runTimestamp = Date.now();

    store.recordEvent({
      id: `compression-run-${runTimestamp}`,
      type: "run",
      timestamp: runTimestamp,
      message: `Compression triggered (${reason})`,
      payload: {
        totalTokens: initialResult.usage.totalTokens,
        budget: currentConfig.maxTokenBudget,
      },
    });

    const finalizeCompression = ({
      artifacts,
      snapshot,
      usageOverride,
      pinnedMessagesOverride,
      eventMessage,
    }: {
      artifacts: CompressionArtifact[];
      snapshot: CompressionSnapshot;
      usageOverride?: Partial<CompressionUsage>;
      pinnedMessagesOverride?: CompressionPinnedMessage[];
      eventMessage?: string;
    }): BuildCompressionPayloadResult => {
      const now = Date.now();
      const effectivePins =
        pinnedMessagesOverride ?? storeSnapshot.pinnedMessages;

      const enrichedSnapshot: CompressionSnapshot = {
        ...snapshot,
        artifactIds:
          snapshot.artifactIds && snapshot.artifactIds.length
            ? snapshot.artifactIds
            : artifacts.map((artifact) => artifact.id),
        tokensBefore:
          typeof snapshot.tokensBefore === "number"
            ? snapshot.tokensBefore
            : initialResult.usage.totalTokens,
        reason: snapshot.reason ?? reason,
      };

      const finalResult = buildCompressionPayload({
        baseMessages,
        pinnedMessages: effectivePins,
        artifacts,
        snapshot: enrichedSnapshot,
        config: currentConfig,
      });

      enrichedSnapshot.tokensAfter = finalResult.usage.totalTokens;
      if (typeof enrichedSnapshot.tokensBefore === "number") {
        enrichedSnapshot.tokensSaved = Math.max(
          enrichedSnapshot.tokensBefore - finalResult.usage.totalTokens,
          0
        );
      }

      const baseMessageIds = baseMessages
        .map((message) => message.id)
        .filter((id): id is string => Boolean(id));
      const survivorSet = new Set(finalResult.survivingMessageIds);
      const combinedExcluded = new Set<string>(
        enrichedSnapshot.excludedMessageIds ?? []
      );
      baseMessageIds.forEach((id) => {
        if (!survivorSet.has(id)) {
          combinedExcluded.add(id);
        }
      });
      if (combinedExcluded.size > 0) {
        const orderedExcluded = baseMessageIds.filter((id) =>
          combinedExcluded.has(id)
        );
        enrichedSnapshot.excludedMessageIds = orderedExcluded;
      } else {
        enrichedSnapshot.excludedMessageIds = undefined;
      }

      const mergedUsage: CompressionUsage = usageOverride
        ? {
            ...finalResult.usage,
            ...usageOverride,
            updatedAt: usageOverride.updatedAt ?? now,
          }
        : finalResult.usage;

      if (pinnedMessagesOverride) {
        store.setPinnedMessages(pinnedMessagesOverride);
      }

      store.setArtifacts(artifacts);
      store.setSnapshot(enrichedSnapshot);
      store.setUsage(mergedUsage, {
        shouldCompress: finalResult.shouldCompress,
        overBudget: finalResult.overBudget,
      });

      artifacts.forEach((artifact) => {
        const alreadyExisted = baselineArtifactIds.has(artifact.id);
        const eventType: CompressionEvent["type"] = alreadyExisted
          ? "artifact-updated"
          : "artifact-created";
        baselineArtifactIds.add(artifact.id);
        store.recordEvent({
          id: `compression-artifact-${artifact.id}-${eventType}`,
          type: eventType,
          timestamp: now,
          message: `${alreadyExisted ? "Artifact updated" : "Artifact created"}: ${
            artifact.title ?? artifact.id
          }`,
          payload: {
            artifactId: artifact.id,
            tokensSaved: artifact.tokensSaved,
          },
        });
      });

      if (eventMessage) {
        store.recordEvent({
          id: `compression-info-${now}`,
          type: "info",
          timestamp: now,
          message: eventMessage,
        });
      }

      currentConfig.onCompression?.({
        snapshot: enrichedSnapshot,
        artifacts,
        pinnedMessages: store.listPinnedMessages(),
        usage: mergedUsage,
      });

      return finalResult;
    };

    const requestPayload: CompressionServiceRequest = {
      messages: baseMessages,
      pinnedMessages: storeSnapshot.pinnedMessages,
      artifacts: storeSnapshot.artifacts,
      snapshot: storeSnapshot.snapshot,
      usage: initialResult.usage,
      config: {
        maxTokenBudget: currentConfig.maxTokenBudget ?? null,
        compressionThreshold: currentConfig.compressionThreshold,
        pinnedMessageLimit: currentConfig.pinnedMessageLimit ?? null,
        model: currentConfig.model ?? null,
      },
      metadata: storeSnapshot.modelMetadata ?? null,
      reason,
    };

    const fetcher = currentConfig.fetcher ?? fetchCompressionService;

    try {
      const response = await fetcher(requestPayload, {
        api: currentConfig.api,
      });

      if (!response?.snapshot || !Array.isArray(response.artifacts)) {
        throw new CompressionServiceError(
          "Invalid compression response payload"
        );
      }

      const responseSnapshot: CompressionSnapshot = {
        ...response.snapshot,
        reason: response.snapshot.reason ?? reason,
      };

      return finalizeCompression({
        artifacts: response.artifacts,
        snapshot: responseSnapshot,
        usageOverride: response.usage,
        pinnedMessagesOverride: response.pinnedMessages,
        eventMessage: `Compression completed via API (${currentConfig.api})`,
      });
    } catch (remoteError) {
      const normalizedRemoteError =
        remoteError instanceof Error
          ? remoteError
          : new Error(String(remoteError));
      const timestamp = Date.now();
      const isServiceError = remoteError instanceof CompressionServiceError;
      const errorPhase: CompressionErrorEvent["phase"] = isServiceError
        ? "payload"
        : "unknown";

      store.recordEvent({
        id: `compression-error-${timestamp}`,
        type: "error",
        timestamp,
        level: "error",
        message: normalizedRemoteError.message,
        payload: {
          phase: errorPhase,
          endpoint: currentConfig.api,
          status: isServiceError
            ? (remoteError as CompressionServiceError).status
            : undefined,
        },
      });

      const errorPayload: CompressionErrorEvent = {
        error: normalizedRemoteError,
        phase: errorPhase,
        timestamp,
        context: {
          budget: currentConfig.maxTokenBudget,
          totalTokens: initialResult.usage.totalTokens,
          reason,
          endpoint: currentConfig.api,
        },
      };

      if (
        isServiceError &&
        (remoteError as CompressionServiceError).status !== undefined
      ) {
        errorPayload.context = {
          ...errorPayload.context,
          status: (remoteError as CompressionServiceError).status,
        };
      }

      currentConfig.onError?.(errorPayload);

      return initialResult;
    }
    },
    []
  );

  return useMemo(
    () => ({
      config: normalizedCompression,
      controller,
      buildPayload,
    }),
    [normalizedCompression, controller, buildPayload]
  );
}
