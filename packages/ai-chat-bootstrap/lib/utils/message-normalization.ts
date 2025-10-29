import type { UIMessage } from "ai";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export interface EnsureMessageMetadataOptions {
  stampTimestamp?: boolean;
  timestamp?: number;
}

export interface NormalizeMessagesOptions {
  shouldStampTimestamp?: (message: UIMessage, index: number) => boolean;
  timestampFactory?: () => number;
}

export interface EnsureMessageMetadataResult {
  message: UIMessage;
  changed: boolean;
}

export interface NormalizeMessagesResult {
  messages: UIMessage[];
  changed: boolean;
}

export function ensureMessageMetadata(
  message: UIMessage,
  options: EnsureMessageMetadataOptions = {}
): EnsureMessageMetadataResult {
  const { stampTimestamp = false, timestamp } = options;

  const metadata = message.metadata;
  const hasMetadataObject = isRecord(metadata);

  let metadataChanged = !hasMetadataObject;
  let nextMetadata: Record<string, unknown> = hasMetadataObject
    ? (metadata as Record<string, unknown>)
    : {};

  if (stampTimestamp) {
    const existingTimestamp = nextMetadata.timestamp;
    const hasValidTimestamp =
      typeof existingTimestamp === "number" && Number.isFinite(existingTimestamp);
    if (!hasValidTimestamp) {
      if (hasMetadataObject && !metadataChanged) {
        nextMetadata = { ...nextMetadata };
      } else if (hasMetadataObject && metadataChanged) {
        nextMetadata = { ...nextMetadata };
      }
      nextMetadata.timestamp = timestamp ?? Date.now();
      metadataChanged = true;
    }
  }

  if (!metadataChanged) {
    return { message, changed: false };
  }

  if (hasMetadataObject && nextMetadata === metadata) {
    nextMetadata = { ...nextMetadata };
  }

  return {
    message: {
      ...message,
      metadata: nextMetadata,
    },
    changed: true,
  };
}

export function normalizeMessagesMetadata(
  messages: UIMessage[],
  options: NormalizeMessagesOptions = {}
): NormalizeMessagesResult {
  const { shouldStampTimestamp, timestampFactory } = options;

  let changed = false;
  let stableTimestamp: number | undefined;

  const normalized = messages.map((message, index) => {
    const shouldStamp =
      typeof shouldStampTimestamp === "function"
        ? shouldStampTimestamp(message, index)
        : false;

    const { message: normalizedMessage, changed: messageChanged } =
      ensureMessageMetadata(message, {
        stampTimestamp: shouldStamp,
        timestamp: shouldStamp
          ? (() => {
              if (typeof stableTimestamp === "number") return stableTimestamp;
              const value = timestampFactory ? timestampFactory() : Date.now();
              stableTimestamp = value;
              return value;
            })()
          : undefined,
      });

    if (messageChanged) {
      changed = true;
    }
    return normalizedMessage;
  });

  if (!changed) {
    return { messages, changed: false };
  }

  return { messages: normalized, changed: true };
}
