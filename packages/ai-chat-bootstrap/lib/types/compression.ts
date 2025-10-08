import type { UIMessage } from "ai";

export type CompressionEventLevel = "info" | "warning" | "error";

export interface CompressionPinnedMessage {
  id: string;
  message: UIMessage;
  pinnedAt: number;
  pinnedBy?: "user" | "system";
  reason?: string;
}

export interface CompressionArtifact {
  id: string;
  title?: string;
  summary: string;
  category?: string;
  createdAt: number;
  updatedAt?: number;
  tokensSaved?: number;
  sourceMessageIds?: string[];
  author?: string;
  editable?: boolean;
  pinned?: boolean;
}

export interface CompressionEvent {
  id: string;
  type:
    | "pin"
    | "unpin"
    | "run"
    | "artifact-created"
    | "artifact-updated"
    | "artifact-removed"
    | "error"
    | "info";
  timestamp: number;
  message?: string;
  level?: CompressionEventLevel;
  payload?: Record<string, unknown>;
}

export interface CompressionUsage {
  totalTokens: number;
  pinnedTokens: number;
  artifactTokens: number;
  survivingTokens: number;
  estimatedResponseTokens?: number;
  remainingTokens?: number;
  budget?: number;
  updatedAt: number;
}

export interface CompressionUsageUpdateOptions {
  appendEvent?: boolean;
  eventMessage?: string;
  shouldCompress?: boolean;
  overBudget?: boolean;
}

export interface CompressionModelMetadata {
  modelId?: string;
  modelLabel?: string;
  contextWindowTokens?: number;
  maxOutputTokens?: number;
  lastUpdatedAt?: number;
}

export interface CompressionSnapshot {
  id: string;
  createdAt: number;
  survivingMessageIds: string[];
  artifactIds: string[];
  tokensBefore?: number;
  tokensAfter?: number;
  tokensSaved?: number;
  reason?: string;
  excludedMessageIds?: string[];
}

export interface BuildCompressionPayloadInput {
  baseMessages: UIMessage[];
  pinnedMessages: CompressionPinnedMessage[];
  artifacts: CompressionArtifact[];
  snapshot: CompressionSnapshot | null;
  config: NormalizedCompressionConfig;
}

export interface BuildCompressionPayloadResult {
  messages: UIMessage[];
  pinnedMessageIds: string[];
  artifactIds: string[];
  survivingMessageIds: string[];
  usage: CompressionUsage;
  shouldCompress: boolean;
  overBudget: boolean;
}

export interface CompressionSummarizerContext {
  messages: UIMessage[];
  pinnedMessages: CompressionPinnedMessage[];
  budget: number | null;
}

export interface CompressionSummarizerResult {
  artifacts: CompressionArtifact[];
  survivingMessageIds: string[];
  usage?: Partial<CompressionUsage>;
}

export type CompressionSummarizer = (
  context: CompressionSummarizerContext
) => Promise<CompressionSummarizerResult>;

export type CompressionCallback = CompressionConfig["onCompression"];
export type CompressionErrorCallback = CompressionConfig["onError"];

export interface CompressionResultPayload {
  snapshot: CompressionSnapshot;
  artifacts: CompressionArtifact[];
  pinnedMessages: CompressionPinnedMessage[];
  usage?: CompressionUsage;
}

export interface CompressionErrorEvent {
  error: Error;
  phase: "budget-check" | "summarizer" | "payload" | "unknown";
  timestamp: number;
  context?: Record<string, unknown>;
}

export type CompressionTriggerReason = "threshold" | "over-budget" | "manual";

export interface CompressionRunOptions {
  force?: boolean;
  reason?: CompressionTriggerReason;
}

export interface CompressionServiceRequest {
  messages: UIMessage[];
  pinnedMessages: CompressionPinnedMessage[];
  artifacts: CompressionArtifact[];
  snapshot: CompressionSnapshot | null;
  usage: CompressionUsage;
  config: {
    maxTokenBudget: number | null;
    compressionThreshold: number;
    pinnedMessageLimit: number | null;
    model?: string | null;
  };
  metadata?: CompressionModelMetadata | null;
  reason: CompressionTriggerReason;
}

export interface CompressionServiceResponse {
  snapshot: CompressionSnapshot;
  artifacts: CompressionArtifact[];
  usage?: CompressionUsage;
  pinnedMessages?: CompressionPinnedMessage[];
}

export interface CompressionServiceOptions {
  signal?: AbortSignal;
  api?: string;
}

export type CompressionServiceFetcher = (
  request: CompressionServiceRequest,
  options?: CompressionServiceOptions
) => Promise<CompressionServiceResponse>;

export interface CompressionConfig {
  enabled?: boolean;
  maxTokenBudget?: number | null;
  compressionThreshold?: number;
  pinnedMessageLimit?: number | null;
   model?: string | null;
  onCompression?: (payload: CompressionResultPayload) => void;
  onError?: (payload: CompressionErrorEvent) => void;
  api?: string;
  fetcher?: CompressionServiceFetcher;
}

export interface PersistedCompressionState {
  snapshot: CompressionSnapshot | null;
  artifacts: CompressionArtifact[];
  usage: CompressionUsage | null;
  metadata: CompressionModelMetadata | null;
  shouldCompress: boolean;
  overBudget: boolean;
  updatedAt: number;
}

export const COMPRESSION_THREAD_METADATA_KEY = "acbCompression" as const;

export interface CompressionControllerActions {
  pinMessage: (message: UIMessage, options?: { reason?: string; pinnedBy?: "user" | "system"; pinnedAt?: number }) => void;
  setPinnedMessages: (pins: CompressionPinnedMessage[]) => void;
  unpinMessage: (messageId: string) => void;
  clearPinnedMessages: () => void;
  addArtifact: (artifact: CompressionArtifact) => void;
  updateArtifact: (artifactId: string, patch: Partial<CompressionArtifact>) => void;
  removeArtifact: (artifactId: string) => void;
  setArtifacts: (artifacts: CompressionArtifact[]) => void;
  clearArtifacts: () => void;
  recordEvent: (event: CompressionEvent) => void;
  setModelMetadata: (metadata: CompressionModelMetadata | null) => void;
  setUsage: (usage: CompressionUsage | null, options?: CompressionUsageUpdateOptions) => void;
  setSnapshot: (snapshot: CompressionSnapshot | null) => void;
}

export interface CompressionController {
  config: CompressionConfig;
  pinnedMessages: CompressionPinnedMessage[];
  artifacts: CompressionArtifact[];
  events: CompressionEvent[];
  usage: CompressionUsage | null;
  metadata: CompressionModelMetadata | null;
  snapshot: CompressionSnapshot | null;
  shouldCompress: boolean;
  overBudget: boolean;
  actions: CompressionControllerActions;
  runCompression?: (options?: CompressionRunOptions) => Promise<BuildCompressionPayloadResult>;
}

export interface NormalizedCompressionConfig {
  enabled: boolean;
  maxTokenBudget: number | null;
  compressionThreshold: number;
  pinnedMessageLimit: number | null;
  model: string | null;
  onCompression?: CompressionCallback;
  onError?: CompressionErrorCallback;
  api: string;
  fetcher?: CompressionServiceFetcher;
}

export const DEFAULT_COMPRESSION_THRESHOLD = 0.85;

export const DEFAULT_COMPRESSION_CONFIG: NormalizedCompressionConfig = {
  enabled: false,
  maxTokenBudget: null,
  compressionThreshold: DEFAULT_COMPRESSION_THRESHOLD,
  pinnedMessageLimit: null,
  model: null,
  api: "/api/compression",
};

export function normalizeCompressionConfig(
  config?: CompressionConfig
): NormalizedCompressionConfig {
  if (!config) {
    return DEFAULT_COMPRESSION_CONFIG;
  }

  const maxTokenBudget =
    config.maxTokenBudget === undefined ? null : config.maxTokenBudget;
  const pinnedMessageLimit =
    config.pinnedMessageLimit === undefined ? null : config.pinnedMessageLimit;

  return {
    enabled: config.enabled ?? false,
    maxTokenBudget,
    compressionThreshold:
      config.compressionThreshold ?? DEFAULT_COMPRESSION_THRESHOLD,
    pinnedMessageLimit,
    model:
      config.model === undefined || config.model === null || config.model === ""
        ? null
        : config.model,
    onCompression: config.onCompression,
    onError: config.onError,
    api: typeof config.api === "string" && config.api.trim().length > 0
      ? config.api
      : DEFAULT_COMPRESSION_CONFIG.api,
    fetcher: config.fetcher,
  };
}
