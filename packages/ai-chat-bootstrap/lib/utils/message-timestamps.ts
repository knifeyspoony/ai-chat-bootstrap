import type { UIMessage } from "ai";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function extractMessageTimestamp(message: UIMessage): number | null {
  const metadata = message.metadata;
  if (!isRecord(metadata)) return null;
  const value = metadata.timestamp;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function formatTimestamp(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMessageTimestamp(message: UIMessage): string | null {
  const timestamp = extractMessageTimestamp(message);
  if (timestamp === null) return null;
  return formatTimestamp(timestamp);
}
