import type { UIMessage } from "ai";

/**
 * Compute a lightweight signature for a list of messages.
 * Includes a content-sensitive fingerprint of the last five messages to
 * capture mutations (e.g. tool results) that keep ids the same.
 */
export function computeMessagesSignature(messages: UIMessage[]): string {
  const tailFingerprints = messages
    .slice(-5)
    .map((message) => `${message.id}:${fingerprintMessage(message)}`)
    .join("|");
  return `${messages.length}:${tailFingerprints}`;
}

function fingerprintMessage(message: UIMessage): string {
  const payload: Record<string, unknown> = {
    role: message.role,
    metadata: normalizeSerializable(message.metadata),
    parts: Array.isArray(message.parts)
      ? message.parts.map(normalizeMessagePart)
      : undefined,
  };

  if ("content" in message) {
    payload.content = normalizeSerializable(
      (message as { content?: unknown }).content
    );
  }

  if ("status" in message) {
    payload.status = normalizeSerializable(
      (message as { status?: unknown }).status
    );
  }

  return hashString(safeStringify(payload));
}

function normalizeMessagePart(part: unknown): unknown {
  if (!part || typeof part !== "object") return part;

  const record = part as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  const knownKeys = [
    "type",
    "state",
    "tool",
    "toolName",
    "toolCallId",
    "participant",
    "name",
    "id",
    "display",
    "variant",
    "severity",
    "title",
    "text",
    "content",
    "input",
    "output",
    "result",
    "data",
    "sources",
    "annotations",
    "metadata",
  ];

  for (const key of knownKeys) {
    if (key in record) {
      normalized[key] = normalizeSerializable(record[key]);
    }
  }

  // Preserve any additional scalar fields that might influence rendering.
  for (const key of Object.keys(record)) {
    if (key in normalized) continue;
    const value = record[key];
    if (isPrimitive(value)) {
      normalized[key] = value;
    }
  }

  return normalized;
}

function normalizeSerializable(value: unknown): unknown {
  if (value == null || isPrimitive(value)) return value;
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeSerializable(entry));
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([key, val]) => [key, normalizeSerializable(val)] as const)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(entries);
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

function isPrimitive(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}
