import type { UIMessage } from "ai";
import type {
  CompressionArtifact,
  CompressionPinnedMessage,
  CompressionSummarizer,
  CompressionSummarizerResult,
} from "../../types/compression";
import {
  calculateTokensForArtifacts,
  calculateTokensForMessages,
  estimateTokenLength,
  extractMessageText,
} from "./token-helpers";

interface MessageEntry {
  message: UIMessage;
  text: string;
  tokens: number;
}

const SUMMARY_CATEGORY = "summary";
const SUMMARY_TITLE = "Conversation Summary";
const MIN_SURVIVOR_MESSAGES = 6;
const RESERVED_COMPLETION_TOKENS = 512;
const SUMMARY_TOKEN_BUDGET = 256;

function buildMessageEntries(messages: UIMessage[]): MessageEntry[] {
  return messages.map((message) => {
    const text = extractMessageText(message).trim();
    const normalizedText = text.replace(/\s+/g, " ");
    return {
      message,
      text: normalizedText,
      tokens: normalizedText ? estimateTokenLength(normalizedText) : 0,
    } satisfies MessageEntry;
  });
}

function computePinnedTokens(pins: CompressionPinnedMessage[]): number {
  if (!pins.length) return 0;
  const uniquePinnedMessages = pins
    .map((pin) => pin.message)
    .filter((value, index, array) => {
      if (!value?.id) return true;
      return array.findIndex((candidate) => candidate?.id === value.id) === index;
    });
  return calculateTokensForMessages(uniquePinnedMessages);
}

function buildSummaryText(entries: MessageEntry[]): string {
  if (!entries.length) return "";

  const lines = entries
    .map((entry) => {
      if (!entry.text) return "";
      const role = entry.message.role ?? "message";
      const truncated = entry.text.length > 280
        ? `${entry.text.slice(0, 277)}…`
        : entry.text;
      return `• ${role}: ${truncated}`;
    })
    .filter(Boolean);

  if (!lines.length) return "";

  return ["Earlier conversation condensed:", ...lines.slice(0, 12)].join("\n");
}

function collectSurvivors(
  entries: MessageEntry[],
  pinnedIds: Set<string>,
  survivorBudgetTokens: number
): {
  survivors: UIMessage[];
  trimmed: MessageEntry[];
} {
  const survivors: UIMessage[] = [];
  const trimmed: MessageEntry[] = [];

  let allocatedTokens = 0;

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    const messageId = entry.message.id ?? `message-${index}`;
    const isPinned = messageId && pinnedIds.has(messageId);

    if (isPinned) {
      survivors.unshift(entry.message);
      continue;
    }

    const keepForQuota = survivors.length < MIN_SURVIVOR_MESSAGES;
    const fitsBudget =
      survivorBudgetTokens === Infinity ||
      entry.tokens === 0 ||
      allocatedTokens + entry.tokens <= survivorBudgetTokens;

    if (keepForQuota || fitsBudget) {
      survivors.unshift(entry.message);
      allocatedTokens += entry.tokens;
    } else {
      trimmed.unshift(entry);
    }
  }

  return { survivors, trimmed };
}

function dedupeIds(ids: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  ids.forEach((id) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    result.push(id);
  });
  return result;
}

function buildArtifact(
  trimmed: MessageEntry[],
  now: number
): CompressionArtifact | null {
  if (!trimmed.length) return null;
  const summary = buildSummaryText(trimmed);
  if (!summary) return null;

  const summaryTokens = estimateTokenLength(summary);
  const trimmedTokens = trimmed.reduce((total, entry) => total + entry.tokens, 0);

  return {
    id: `artifact-${now}`,
    title: SUMMARY_TITLE,
    summary,
    category: SUMMARY_CATEGORY,
    createdAt: now,
    updatedAt: now,
    tokensSaved: Math.max(trimmedTokens - summaryTokens, 0),
    sourceMessageIds: dedupeIds(trimmed.map((entry) => entry.message.id)),
    editable: true,
  };
}

function calculateSurvivingTokens(
  survivors: UIMessage[],
  pinnedIds: Set<string>
): number {
  const unpinned = survivors.filter((message) => {
    const id = message.id;
    return !id || !pinnedIds.has(id);
  });
  return calculateTokensForMessages(unpinned);
}

export const defaultCompressionSummarizer: CompressionSummarizer = async ({
  messages,
  pinnedMessages,
  budget,
}) => {
  const entries = buildMessageEntries(messages);
  const pinnedIds = new Set<string>(
    pinnedMessages
      .map((pin) => pin.message.id)
      .filter((id): id is string => Boolean(id))
  );

  const pinnedTokens = computePinnedTokens(pinnedMessages);
  const numericBudget =
    typeof budget === "number" && Number.isFinite(budget)
      ? Math.max(budget, 0)
      : null;

  const survivorBudgetTokens = numericBudget === null
    ? Infinity
    : Math.max(
        numericBudget - pinnedTokens - RESERVED_COMPLETION_TOKENS - SUMMARY_TOKEN_BUDGET,
        0
      );

  const { survivors, trimmed } = collectSurvivors(
    entries,
    pinnedIds,
    survivorBudgetTokens
  );

  const now = Date.now();
  const artifact = buildArtifact(trimmed, now);

  const artifacts = artifact ? [artifact] : [];
  const artifactTokens = calculateTokensForArtifacts(artifacts);
  const survivingTokens = calculateSurvivingTokens(survivors, pinnedIds);

  const totalTokens = pinnedTokens + survivingTokens + artifactTokens;

  const survivingIds = dedupeIds([
    ...pinnedMessages.map((pin) => pin.message.id),
    ...survivors.map((message) => message.id),
  ]);

  const result: CompressionSummarizerResult = {
    artifacts,
    survivingMessageIds: survivingIds,
    usage: {
      pinnedTokens,
      artifactTokens,
      survivingTokens,
      totalTokens,
      updatedAt: now,
    },
  };

  return result;
};

export function summarizeWithDefault(
  context: Parameters<CompressionSummarizer>[0],
  override?: CompressionSummarizer
) {
  const summarizer = override ?? defaultCompressionSummarizer;
  return summarizer(context);
}
