import type { UIMessage } from "ai";
import type {
  CompressionArtifact,
  CompressionPinnedMessage,
  CompressionSnapshot,
  CompressionUsage,
} from "../../types/compression";

export const COMPRESSION_MESSAGE_METADATA_KEY = "acbCompression";

export interface CompressionMessageMetadata {
  pinned?: CompressionMessagePinnedState;
  compression?: CompressionMessageCompressionState;
}

export interface CompressionMessagePinnedState {
  pinnedAt: number;
  pinnedBy?: "user" | "system";
  reason?: string;
}

export interface CompressionMessageCompressionState {
  snapshotId: string;
  compressedAt: number;
  surviving: boolean;
  kind?: "message" | "event";
  reason?: string;
  artifactIds?: string[];
}

interface ApplyCompressionMetadataParams {
  snapshot: CompressionSnapshot | null;
}

interface EnsureCompressionEventParams {
  snapshot: CompressionSnapshot;
  artifacts: CompressionArtifact[];
  usage: CompressionUsage | null;
}

interface ApplyResult {
  messages: UIMessage[];
  changed: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cloneMetadata(metadata: Record<string, unknown> | undefined) {
  return metadata ? { ...metadata } : {};
}

function cloneCompressionMetadata(
  metadata: CompressionMessageMetadata | undefined
): CompressionMessageMetadata {
  if (!metadata) return {};
  const next: CompressionMessageMetadata = {};
  if (metadata.pinned) {
    next.pinned = { ...metadata.pinned };
  }
  if (metadata.compression) {
    const { artifactIds, ...rest } = metadata.compression;
    next.compression = {
      ...rest,
      artifactIds: artifactIds ? [...artifactIds] : undefined,
    };
  }
  return next;
}

function arraysShallowEqual(a?: string[], b?: string[]): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function compressionMetadataEquals(
  a: CompressionMessageMetadata | undefined,
  b: CompressionMessageMetadata | undefined
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;

  const aPinned = a.pinned;
  const bPinned = b.pinned;
  const pinnedEqual =
    (!aPinned && !bPinned) ||
    (aPinned &&
      bPinned &&
      aPinned.pinnedAt === bPinned.pinnedAt &&
      aPinned.pinnedBy === bPinned.pinnedBy &&
      aPinned.reason === bPinned.reason);

  if (!pinnedEqual) return false;

  const aCompression = a.compression;
  const bCompression = b.compression;
  const compressionEqual =
    (!aCompression && !bCompression) ||
    (aCompression &&
      bCompression &&
      aCompression.snapshotId === bCompression.snapshotId &&
      aCompression.compressedAt === bCompression.compressedAt &&
      aCompression.surviving === bCompression.surviving &&
      (aCompression.kind ?? "message") === (bCompression.kind ?? "message") &&
      (aCompression.reason ?? null) === (bCompression.reason ?? null) &&
      arraysShallowEqual(aCompression.artifactIds, bCompression.artifactIds));

  if (!compressionEqual) return false;

  const aKeys = Object.keys(a).filter((key) => key !== "pinned" && key !== "compression");
  const bKeys = Object.keys(b).filter((key) => key !== "pinned" && key !== "compression");
  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) => {
    const aValue = (a as Record<string, unknown>)[key];
    const bValue = (b as Record<string, unknown>)[key];
    return Object.is(aValue, bValue);
  });
}

function normalizePinnedState(
  pinned: CompressionMessagePinnedState | null | undefined
): CompressionMessagePinnedState | undefined {
  if (!pinned) return undefined;
  if (typeof pinned.pinnedAt !== "number" || !Number.isFinite(pinned.pinnedAt)) {
    return undefined;
  }
  return {
    pinnedAt: pinned.pinnedAt,
    pinnedBy: pinned.pinnedBy,
    reason: pinned.reason,
  };
}

function normalizeCompressionState(
  compression: CompressionMessageCompressionState | null | undefined
): CompressionMessageCompressionState | undefined {
  if (!compression) return undefined;
  if (typeof compression.snapshotId !== "string" || compression.snapshotId.length === 0) {
    return undefined;
  }
  if (
    typeof compression.compressedAt !== "number" ||
    !Number.isFinite(compression.compressedAt)
  ) {
    return undefined;
  }
  const surviving = Boolean(compression.surviving);
  const kind: "message" | "event" = compression.kind === "event" ? "event" : "message";
  const reason = typeof compression.reason === "string" ? compression.reason : undefined;
  let artifactIds: string[] | undefined;
  if (Array.isArray(compression.artifactIds)) {
    const deduped = new Set<string>();
    compression.artifactIds.forEach((id) => {
      if (typeof id === "string" && id.length > 0) {
        deduped.add(id);
      }
    });
    if (deduped.size > 0) {
      artifactIds = Array.from(deduped);
    }
  }

  return {
    snapshotId: compression.snapshotId,
    compressedAt: compression.compressedAt,
    surviving,
    kind,
    reason,
    artifactIds,
  };
}

export function getCompressionMessageMetadata(
  message: UIMessage
): CompressionMessageMetadata | undefined {
  const metadata = message.metadata;
  if (!isRecord(metadata)) return undefined;
  const value = metadata[COMPRESSION_MESSAGE_METADATA_KEY];
  if (!isRecord(value)) return undefined;
  return value as CompressionMessageMetadata;
}

export function getCompressionMessageCompressionState(
  message: UIMessage
): CompressionMessageCompressionState | undefined {
  const metadata = getCompressionMessageMetadata(message);
  return normalizeCompressionState(metadata?.compression);
}

function writeCompressionMetadata(
  message: UIMessage,
  metadata: CompressionMessageMetadata | undefined
): UIMessage {
  const baseMetadata = cloneMetadata(
    (message.metadata as Record<string, unknown> | undefined)
  );

  if (metadata && Object.keys(metadata).length > 0) {
    baseMetadata[COMPRESSION_MESSAGE_METADATA_KEY] = metadata;
  } else {
    delete baseMetadata[COMPRESSION_MESSAGE_METADATA_KEY];
  }

  const hasMetadata = Object.keys(baseMetadata).length > 0;

  if (!hasMetadata) {
    if (!message.metadata) {
      return message;
    }
    return {
      ...message,
      metadata: undefined,
    } as UIMessage;
  }

  return {
    ...message,
    metadata: baseMetadata,
  } as UIMessage;
}

export function withCompressionPinnedState(
  message: UIMessage,
  pinned: CompressionMessagePinnedState | null
): UIMessage {
  const targetPinned = normalizePinnedState(pinned);
  const previousMetadata = getCompressionMessageMetadata(message);

  const nextCompressionMetadata = (() => {
    if (targetPinned) {
      const base = cloneCompressionMetadata(previousMetadata);
      base.pinned = targetPinned;
      return base;
    }
    if (!previousMetadata) {
      return undefined;
    }
    const base = cloneCompressionMetadata(previousMetadata);
    delete base.pinned;
    return Object.keys(base).length > 0 ? base : undefined;
  })();

  const compressionUnchanged = compressionMetadataEquals(
    previousMetadata,
    nextCompressionMetadata
  );

  if (compressionUnchanged) {
    return message;
  }

  return writeCompressionMetadata(message, nextCompressionMetadata);
}

export function withCompressionCompressionState(
  message: UIMessage,
  compression: CompressionMessageCompressionState | null
): UIMessage {
  const targetCompression = normalizeCompressionState(compression);
  const previousMetadata = getCompressionMessageMetadata(message);

  const nextCompressionMetadata = (() => {
    if (targetCompression) {
      const base = cloneCompressionMetadata(previousMetadata);
      base.compression = targetCompression;
      return base;
    }
    if (!previousMetadata) {
      return undefined;
    }
    const base = cloneCompressionMetadata(previousMetadata);
    delete base.compression;
    return Object.keys(base).length > 0 ? base : undefined;
  })();

  const compressionUnchanged = compressionMetadataEquals(
    previousMetadata,
    nextCompressionMetadata
  );

  if (compressionUnchanged) {
    return message;
  }

  return writeCompressionMetadata(message, nextCompressionMetadata);
}

export function extractPinnedMessagesFromMetadata(
  messages: UIMessage[]
): CompressionPinnedMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  const result: CompressionPinnedMessage[] = [];
  messages.forEach((message) => {
    if (!message?.id) return;
    const metadata = getCompressionMessageMetadata(message);
    const pinned = normalizePinnedState(metadata?.pinned);
    if (!pinned) return;

    result.push({
      id: message.id,
      message,
      pinnedAt: pinned.pinnedAt,
      pinnedBy: pinned.pinnedBy,
      reason: pinned.reason,
    });
  });

  return result;
}

function applyCompressionMetadata(
  messages: UIMessage[],
  { snapshot }: ApplyCompressionMetadataParams
): ApplyResult {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { messages, changed: false };
  }

  if (!snapshot) {
    let removed = false;
    const cleared = messages.map((message) => {
      const existing = getCompressionMessageCompressionState(message);
      if (!existing) return message;
      removed = true;
      return withCompressionCompressionState(message, null);
    });
    return { messages: removed ? cleared : messages, changed: removed };
  }

  const survivingSet = new Set(snapshot.survivingMessageIds ?? []);
  const excludedSet = new Set(snapshot.excludedMessageIds ?? []);
  let changed = false;

  const updated = messages.map((message) => {
    const messageId = message.id;
    if (!messageId) {
      if (getCompressionMessageCompressionState(message)) {
        changed = true;
        return withCompressionCompressionState(message, null);
      }
      return message;
    }

    let targetState: CompressionMessageCompressionState | null = null;
    if (excludedSet.has(messageId)) {
      targetState = {
        snapshotId: snapshot.id,
        compressedAt: snapshot.createdAt,
        surviving: false,
        kind: "message",
        reason: "excluded",
      };
    } else if (survivingSet.has(messageId)) {
      targetState = {
        snapshotId: snapshot.id,
        compressedAt: snapshot.createdAt,
        surviving: true,
        kind: "message",
        reason: "survivor",
      };
    }

    const next = withCompressionCompressionState(message, targetState);
    if (next !== message) {
      changed = true;
    }
    return next;
  });

  return { messages: changed ? updated : messages, changed };
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

function buildEventMessageText(
  snapshot: CompressionSnapshot,
  artifacts: CompressionArtifact[],
  usage: CompressionUsage | null
): string {
  const lines: string[] = [];
  const timestamp = new Date(snapshot.createdAt).toISOString();
  const reason = snapshot.reason ? ` (${snapshot.reason})` : "";
  lines.push(`Context compression applied${reason} at ${timestamp}.`);

  if (
    typeof snapshot.tokensBefore === "number" ||
    typeof snapshot.tokensAfter === "number" ||
    typeof snapshot.tokensSaved === "number"
  ) {
    const before =
      typeof snapshot.tokensBefore === "number" ? snapshot.tokensBefore : undefined;
    const after =
      typeof snapshot.tokensAfter === "number" ? snapshot.tokensAfter : undefined;
    const saved =
      typeof snapshot.tokensSaved === "number"
        ? snapshot.tokensSaved
        : typeof before === "number" && typeof after === "number"
        ? Math.max(before - after, 0)
        : undefined;

    const parts: string[] = [];
    if (typeof before === "number") parts.push(`before ${before}`);
    if (typeof after === "number") parts.push(`after ${after}`);
    if (typeof saved === "number") parts.push(`saved ${saved}`);
    if (parts.length > 0) {
      lines.push(`Tokens: ${parts.join(", ")}.`);
    }
  }

  if (usage?.budget !== undefined) {
    const remaining =
      usage.remainingTokens !== undefined ? `, remaining ${usage.remainingTokens}` : "";
    lines.push(`Budget: ${usage.budget}${remaining}.`);
  }

  if (artifacts.length > 0) {
    lines.push("Artifacts:");
    artifacts.slice(0, 5).forEach((artifact) => {
      const title = artifact.title ? `${artifact.title}: ` : "";
      const summary = artifact.summary ? truncate(artifact.summary, 240) : "";
      lines.push(` • ${title}${summary}`.trim());
    });
  }

  return lines.join("\n");
}

export function buildCompressionEventMessage({
  snapshot,
  artifacts,
  usage,
}: EnsureCompressionEventParams): UIMessage {
  const id = `compression-event-${snapshot.id}`;
  const text = buildEventMessageText(snapshot, artifacts, usage);

  const base: UIMessage = {
    id,
    role: "system",
    parts: [
      {
        type: "text",
        text,
      } as UIMessage["parts"][number],
    ],
  };

  return withCompressionCompressionState(base, {
    snapshotId: snapshot.id,
    compressedAt: snapshot.createdAt,
    surviving: true,
    kind: "event",
    reason: "compression-event",
  });
}

export function ensureCompressionEventMessage(
  messages: UIMessage[],
  params: EnsureCompressionEventParams
): ApplyResult {
  const eventMessage = buildCompressionEventMessage(params);
  const existingIndex = messages.findIndex(
    (message) => message?.id === eventMessage.id
  );

  if (existingIndex === -1) {
    return { messages: [...messages, eventMessage], changed: true };
  }

  const existing = messages[existingIndex];
  const existingText =
    existing.parts && existing.parts.length > 0 && existing.parts[0]?.type === "text"
      ? existing.parts[0]?.text ?? ""
      : "";
  const incomingText =
    eventMessage.parts && eventMessage.parts.length > 0 && eventMessage.parts[0]?.type === "text"
      ? eventMessage.parts[0]?.text ?? ""
      : "";
  const metadataEqual = compressionMetadataEquals(
    getCompressionMessageMetadata(existing),
    getCompressionMessageMetadata(eventMessage)
  );

  if (existingText === incomingText && metadataEqual) {
    return { messages, changed: false };
  }

  const next = messages.slice();
  next[existingIndex] = eventMessage;
  return { messages: next, changed: true };
}

export function applyCompressionMetadataToMessages(
  messages: UIMessage[],
  snapshot: CompressionSnapshot | null
): ApplyResult {
  return applyCompressionMetadata(messages, { snapshot });
}
