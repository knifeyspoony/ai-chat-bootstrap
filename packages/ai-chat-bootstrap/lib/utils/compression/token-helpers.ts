import type { UIMessage } from "ai";
import { estimateTokens } from "../token-utils";

type MessagePart = UIMessage["parts"][number];

function safeStringify(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

function extractPartText(part: MessagePart): string {
  if (!part || typeof part !== "object") return "";
  const type = (part as { type?: string }).type;

  switch (type) {
    case "text":
    case "reasoning": {
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    }
    case "source-url": {
      const title = (part as { title?: unknown }).title;
      const url = (part as { url?: unknown }).url;
      return [title, url].filter((segment) => typeof segment === "string").join(" ");
    }
    case "source-document": {
      const title = (part as { title?: unknown }).title;
      return typeof title === "string" ? title : "";
    }
    case "file": {
      const filename = (part as { filename?: unknown }).filename;
      const mediaType = (part as { mediaType?: unknown }).mediaType;
      return [filename, mediaType]
        .filter((segment) => typeof segment === "string")
        .join(" ");
    }
    default: {
      if (type && (type.startsWith("tool-") || type === "dynamic-tool")) {
        const tool = part as {
          input?: unknown;
          output?: unknown;
          errorText?: unknown;
        };
        const sections = [
          safeStringify(tool.input),
          safeStringify(tool.output),
          typeof tool.errorText === "string" ? tool.errorText : undefined,
        ].filter(Boolean) as string[];
        return sections.join("\n");
      }

      if (
        "text" in part &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }

      if (
        "content" in part &&
        typeof (part as { content?: unknown }).content === "string"
      ) {
        return (part as { content: string }).content;
      }

      return "";
    }
  }
}

export function extractMessageText(message: UIMessage): string {
  const parts = message?.parts;
  if (!Array.isArray(parts)) {
    const fallback = (message as { content?: unknown }).content;
    return typeof fallback === "string" ? fallback : "";
  }

  const segments: string[] = [];
  parts.forEach((part) => {
    const text = extractPartText(part as MessagePart);
    if (text) segments.push(text);
  });

  if (segments.length === 0) {
    const fallback = (message as { content?: unknown }).content;
    if (typeof fallback === "string") {
      segments.push(fallback);
    }
  }

  return segments.join("\n");
}

export function calculateTokensForMessages(messages: UIMessage[]): number {
  if (!messages.length) return 0;
  return messages.reduce((total, message) => {
    const text = extractMessageText(message);
    if (!text) return total;
    return total + estimateTokens(text);
  }, 0);
}

export function calculateTokensForArtifacts(artifacts: {
  summary?: string;
  title?: string;
}[]): number {
  if (!artifacts.length) return 0;
  return artifacts.reduce((total, artifact) => {
    const segments = [artifact.title, artifact.summary]
      .filter((segment): segment is string => typeof segment === "string")
      .join("\n");
    if (!segments) return total;
    return total + estimateTokens(segments);
  }, 0);
}

type TokenEstimateInput = string | UIMessage | { summary?: string; title?: string };

export function estimateTokenLength(value: TokenEstimateInput): number {
  if (typeof value === "string") {
    return value ? estimateTokens(value) : 0;
  }
  if ("role" in value) {
    return estimateTokens(extractMessageText(value));
  }
  const segments = [value.title, value.summary]
    .filter((segment): segment is string => typeof segment === "string")
    .join("\n");
  return segments ? estimateTokens(segments) : 0;
}
