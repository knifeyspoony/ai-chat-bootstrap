import { useCallback, useEffect, useMemo, useRef } from "react";
import type { UIMessage } from "ai";
import { useAICompressionStore } from "../stores";
import type {
  CompressionConfig,
  CompressionErrorEvent,
  CompressionEvent,
  CompressionPinnedMessage,
  CompressionArtifact,
  CompressionSnapshot,
  NormalizedCompressionConfig,
} from "../types/compression";
import { normalizeCompressionConfig } from "../types/compression";
import {
  buildCompressionPayload,
  type BuildCompressionPayloadResult,
} from "../utils/compression/build-payload";
import { summarizeWithDefault } from "../utils/compression/default-summarizer";
import { extractMessageText } from "../utils/compression/token-helpers";
import { useAIContext } from "./use-ai-context";
import { useCompressionController } from "./use-compression-controller";

export interface UseAIChatCompressionOptions {
  compression?: CompressionConfig;
}

export interface AIChatCompressionHelpers {
  config: NormalizedCompressionConfig;
  controller: ReturnType<typeof useCompressionController>;
  buildPayload: (
    baseMessages: UIMessage[]
  ) => Promise<BuildCompressionPayloadResult>;
}

interface PinnedMessageContextEntry {
  id: string;
  messageId?: string;
  role?: UIMessage["role"];
  pinnedAt?: string;
  pinnedBy?: "user" | "system";
  reason?: string;
  text: string;
}

interface ArtifactContextEntry {
  id: string;
  title?: string;
  category?: string;
  tokensSaved?: number;
  createdAt?: string;
  updatedAt?: string;
  summary: string;
  sourceMessageIds?: string[];
  editable?: boolean;
}

interface EventContextEntry {
  id: string;
  type: CompressionEvent["type"];
  timestamp?: string;
  level?: CompressionEvent["level"];
  message?: string;
  payload?: Record<string, unknown>;
}

interface MetadataContextEntry {
  model?: {
    id?: string;
    label?: string;
    contextWindowTokens?: number;
    maxOutputTokens?: number;
    lastUpdatedAt?: string;
  };
  usage?: {
    totalTokens: number;
    pinnedTokens: number;
    artifactTokens: number;
    survivingTokens: number;
    estimatedResponseTokens?: number;
    remainingTokens?: number;
    budget?: number;
    updatedAt?: string;
  };
  shouldCompress: boolean;
  overBudget: boolean;
}

const PIN_SNIPPET_LENGTH = 160;
const ARTIFACT_SNIPPET_LENGTH = 200;
const MAX_CONTEXT_EVENTS = 12;

function safeJson(value: unknown): string | undefined {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

function truncateText(text: string, limit: number): string {
  if (!text) return "";
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(limit - 3, 0))}...`;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function toIsoTimestamp(timestamp?: number): string | undefined {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return undefined;
  }
  try {
    return new Date(timestamp).toISOString();
  } catch {
    return undefined;
  }
}

function mapPinnedMessagesForContext(
  pins: CompressionPinnedMessage[]
): PinnedMessageContextEntry[] {
  if (!pins.length) return [];

  return pins.map((pin) => {
    const messageText = normalizeWhitespace(extractMessageText(pin.message));
    return {
      id: pin.id,
      messageId: pin.message?.id,
      role: pin.message?.role,
      pinnedAt: toIsoTimestamp(pin.pinnedAt),
      pinnedBy: pin.pinnedBy,
      reason: pin.reason,
      text: truncateText(messageText, PIN_SNIPPET_LENGTH),
    } satisfies PinnedMessageContextEntry;
  });
}

function mapArtifactsForContext(
  artifacts: CompressionArtifact[]
): ArtifactContextEntry[] {
  if (!artifacts.length) return [];

  return artifacts.map((artifact) => {
    const summaryText = normalizeWhitespace(artifact.summary ?? "");
    return {
      id: artifact.id,
      title: artifact.title,
      category: artifact.category,
      tokensSaved: artifact.tokensSaved,
      createdAt: toIsoTimestamp(artifact.createdAt),
      updatedAt: toIsoTimestamp(artifact.updatedAt),
      sourceMessageIds: artifact.sourceMessageIds,
      editable: artifact.editable,
      summary: truncateText(summaryText, ARTIFACT_SNIPPET_LENGTH),
    } satisfies ArtifactContextEntry;
  });
}

function mapEventsForContext(events: CompressionEvent[]): EventContextEntry[] {
  if (!events.length) return [];

  const sliced = events.slice(-MAX_CONTEXT_EVENTS);
  return sliced.map((event) => ({
    id: event.id,
    type: event.type,
    timestamp: toIsoTimestamp(event.timestamp),
    level: event.level,
    message: event.message,
    payload: event.payload,
  } satisfies EventContextEntry));
}

function mapMetadataForContext(
  metadata: ReturnType<typeof useCompressionController>["metadata"],
  usage: ReturnType<typeof useCompressionController>["usage"],
  shouldCompress: boolean,
  overBudget: boolean
): MetadataContextEntry | null {
  const hasMetadata = Boolean(metadata);
  const hasUsage = Boolean(usage);

  if (!hasMetadata && !hasUsage && !shouldCompress && !overBudget) {
    return null;
  }

  return {
    model: metadata
      ? {
          id: metadata.modelId,
          label: metadata.modelLabel,
          contextWindowTokens: metadata.contextWindowTokens,
          maxOutputTokens: metadata.maxOutputTokens,
          lastUpdatedAt: toIsoTimestamp(metadata.lastUpdatedAt),
        }
      : undefined,
    usage: usage
      ? {
          totalTokens: usage.totalTokens,
          pinnedTokens: usage.pinnedTokens,
          artifactTokens: usage.artifactTokens,
          survivingTokens: usage.survivingTokens,
          estimatedResponseTokens: usage.estimatedResponseTokens,
          remainingTokens: usage.remainingTokens,
          budget: usage.budget,
          updatedAt: toIsoTimestamp(usage.updatedAt),
        }
      : undefined,
    shouldCompress,
    overBudget,
  } satisfies MetadataContextEntry;
}

function dumpPinnedMessagesContext(
  description: string,
  value: unknown
): string {
  const entries = Array.isArray(value)
    ? (value as PinnedMessageContextEntry[])
    : [];

  if (entries.length === 0) {
    return `${description}: none`;
  }
  const lines = entries.map((entry, index) => {
    const parts = [
      `#${index + 1}`,
      entry.role ? `role=${entry.role}` : undefined,
      entry.messageId ? `messageId=${entry.messageId}` : undefined,
      entry.pinnedBy ? `by=${entry.pinnedBy}` : undefined,
      entry.pinnedAt ? `at=${entry.pinnedAt}` : undefined,
      entry.reason ? `reason=${entry.reason}` : undefined,
      entry.text ? `text="${entry.text}"` : undefined,
    ].filter(Boolean);
    return `- ${parts.join(" ")}`;
  });
  return `${description}:\n${lines.join("\n")}`;
}

function dumpArtifactsContext(
  description: string,
  value: unknown
): string {
  const entries = Array.isArray(value)
    ? (value as ArtifactContextEntry[])
    : [];

  if (entries.length === 0) {
    return `${description}: none`;
  }
  const lines = entries.map((artifact) => {
    const parts = [
      `id=${artifact.id}`,
      artifact.title ? `title="${artifact.title}"` : undefined,
      artifact.category ? `category=${artifact.category}` : undefined,
      typeof artifact.tokensSaved === "number"
        ? `tokensSaved=${artifact.tokensSaved}`
        : undefined,
      artifact.updatedAt ? `updatedAt=${artifact.updatedAt}` : undefined,
      artifact.editable ? "editable=true" : undefined,
      artifact.summary ? `summary="${artifact.summary}"` : undefined,
    ].filter(Boolean);
    return `- ${parts.join(" ")}`;
  });
  return `${description}:\n${lines.join("\n")}`;
}

function dumpEventsContext(
  description: string,
  value: unknown
): string {
  const entries = Array.isArray(value)
    ? (value as EventContextEntry[])
    : [];

  if (entries.length === 0) {
    return `${description}: none`;
  }
  const lines = entries.map((event) => {
    const payloadJson = event.payload ? safeJson(event.payload) : undefined;
    const parts = [
      `id=${event.id}`,
      `type=${event.type}`,
      event.level ? `level=${event.level}` : undefined,
      event.timestamp ? `timestamp=${event.timestamp}` : undefined,
      event.message ? `msg="${event.message}"` : undefined,
      payloadJson ? `payload=${payloadJson}` : undefined,
    ].filter(Boolean);
    return `- ${parts.join(" ")}`;
  });
  return `${description}:\n${lines.join("\n")}`;
}

function dumpMetadataContext(
  description: string,
  value: unknown
): string {
  const entry = (value ?? null) as MetadataContextEntry | null;

  if (!entry) {
    return `${description}: none`;
  }

  const sections: string[] = [];
  if (entry.model) {
    sections.push(
      `model: ${JSON.stringify(entry.model)}`
    );
  }
  if (entry.usage) {
    sections.push(`usage: ${JSON.stringify(entry.usage)}`);
  }
  sections.push(
    `status: ${JSON.stringify({
      shouldCompress: entry.shouldCompress,
      overBudget: entry.overBudget,
    })}`
  );
  return `${description}:\n${sections.join("\n")}`;
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

  const pinnedMessagesForContext = useMemo(
    () => mapPinnedMessagesForContext(controller.pinnedMessages),
    [controller.pinnedMessages]
  );

  const artifactsForContext = useMemo(
    () => mapArtifactsForContext(controller.artifacts),
    [controller.artifacts]
  );

  const eventsForContext = useMemo(
    () => mapEventsForContext(controller.events),
    [controller.events]
  );

  const metadataForContext = useMemo(
    () =>
      mapMetadataForContext(
        controller.metadata,
        controller.usage,
        controller.shouldCompress,
        controller.overBudget
      ),
    [
      controller.metadata,
      controller.usage,
      controller.shouldCompress,
      controller.overBudget,
    ]
  );

  useAIContext(
    {
      description: "Compression Pinned Messages",
      value: pinnedMessagesForContext,
      available: pinnedMessagesForContext.length > 0 ? "enabled" : "disabled",
      categories: ["compression", "pins"],
      priority: 80,
      dump: dumpPinnedMessagesContext,
    },
    [pinnedMessagesForContext]
  );

  useAIContext(
    {
      description: "Compression Artifacts",
      value: artifactsForContext,
      available: artifactsForContext.length > 0 ? "enabled" : "disabled",
      categories: ["compression", "artifacts"],
      priority: 60,
      dump: dumpArtifactsContext,
    },
    [artifactsForContext]
  );

  useAIContext(
    {
      description: "Compression Events",
      value: eventsForContext,
      available: eventsForContext.length > 0 ? "enabled" : "disabled",
      categories: ["compression", "events"],
      priority: 30,
      dump: dumpEventsContext,
    },
    [eventsForContext]
  );

  useAIContext(
    {
      description: "Compression Model Metadata",
      value: metadataForContext,
      available: metadataForContext ? "enabled" : "disabled",
      categories: ["compression", "metadata"],
      priority: 40,
      dump: dumpMetadataContext,
    },
    [metadataForContext]
  );

  const buildPayload = useCallback(async (baseMessages: UIMessage[]) => {
    const store = useAICompressionStore.getState();
    const currentConfig = configRef.current;

    const snapshot = store.getSnapshot();
    const initialResult = buildCompressionPayload({
      baseMessages,
      pinnedMessages: snapshot.pinnedMessages,
      artifacts: snapshot.artifacts,
      snapshot: snapshot.snapshot,
      config: currentConfig,
    });

    store.setUsage(initialResult.usage, {
      shouldCompress: initialResult.shouldCompress,
      overBudget: initialResult.overBudget,
    });

    const canCompress = currentConfig.enabled && initialResult.shouldCompress;

    if (!canCompress) {
      return initialResult;
    }

    const reason = initialResult.overBudget ? "over-budget" : "threshold";
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

    try {
      const summarizerResult = await summarizeWithDefault(
        {
          messages: baseMessages,
          pinnedMessages: snapshot.pinnedMessages,
          budget: currentConfig.maxTokenBudget ?? null,
        },
        currentConfig.summarizer
      );

      const proposedSnapshot: CompressionSnapshot = {
        id: `snapshot-${runTimestamp}`,
        createdAt: runTimestamp,
        survivingMessageIds: summarizerResult.survivingMessageIds,
        artifactIds: summarizerResult.artifacts.map((artifact) => artifact.id),
        tokensBefore: initialResult.usage.totalTokens,
        reason,
      };

      const finalResult = buildCompressionPayload({
        baseMessages,
        pinnedMessages: snapshot.pinnedMessages,
        artifacts: summarizerResult.artifacts,
        snapshot: proposedSnapshot,
        config: currentConfig,
      });

      proposedSnapshot.tokensAfter = finalResult.usage.totalTokens;
      if (typeof proposedSnapshot.tokensBefore === "number") {
        proposedSnapshot.tokensSaved = Math.max(
          proposedSnapshot.tokensBefore - finalResult.usage.totalTokens,
          0
        );
      }

      const now = Date.now();
      const mergedUsage = summarizerResult.usage
        ? {
            ...finalResult.usage,
            ...summarizerResult.usage,
            updatedAt: summarizerResult.usage.updatedAt ?? now,
          }
        : finalResult.usage;

      store.setArtifacts(summarizerResult.artifacts);
      store.setSnapshot(proposedSnapshot);
      store.setUsage(mergedUsage, {
        shouldCompress: finalResult.shouldCompress,
        overBudget: finalResult.overBudget,
      });

      summarizerResult.artifacts.forEach((artifact) => {
        store.recordEvent({
          id: `compression-artifact-${artifact.id}`,
          type: "artifact-created",
          timestamp: now,
          message: `Artifact created: ${artifact.title ?? artifact.id}`,
          payload: {
            artifactId: artifact.id,
            tokensSaved: artifact.tokensSaved,
          },
        });
      });

      currentConfig.onCompression?.({
        snapshot: proposedSnapshot,
        artifacts: summarizerResult.artifacts,
        pinnedMessages: store.listPinnedMessages(),
        usage: mergedUsage,
      });

      return finalResult;
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error(String(error));
      const timestamp = Date.now();

      store.recordEvent({
        id: `compression-error-${timestamp}`,
        type: "error",
        timestamp,
        level: "error",
        message: normalizedError.message,
        payload: {
          phase: "summarizer",
        },
      });

      const errorPayload: CompressionErrorEvent = {
        error: normalizedError,
        phase: "summarizer",
        timestamp,
        context: {
          budget: currentConfig.maxTokenBudget,
          totalTokens: initialResult.usage.totalTokens,
          reason,
        },
      };

      currentConfig.onError?.(errorPayload);

      return initialResult;
    }
  }, []);

  return useMemo(
    () => ({
      config: normalizedCompression,
      controller,
      buildPayload,
    }),
    [normalizedCompression, controller, buildPayload]
  );
}
