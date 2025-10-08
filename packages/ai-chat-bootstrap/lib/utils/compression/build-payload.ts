import type { UIMessage } from "ai";
import type {
  BuildCompressionPayloadInput,
  BuildCompressionPayloadResult,
  CompressionArtifact,
  CompressionPinnedMessage,
  CompressionSnapshot,
  CompressionUsage,
} from "../../types/compression";
import {
  calculateTokensForArtifacts,
  calculateTokensForMessages,
} from "./token-helpers";
import { getCompressionMessageCompressionState } from "./message-metadata";

const ARTIFACT_MESSAGE_PREFIX = "artifact";

function resolvePinnedMessages(
  baseMessages: UIMessage[],
  pins: CompressionPinnedMessage[]
): { ordered: UIMessage[]; pinnedIds: string[] } {
  if (pins.length === 0) {
    return { ordered: [], pinnedIds: [] };
  }

  const messageIndex = new Map<string, number>();
  baseMessages.forEach((message, index) => {
    if (message?.id) {
      messageIndex.set(message.id, index);
    }
  });

  const sortedPins = [...pins].sort((a, b) => {
    const indexA = messageIndex.get(a.message.id);
    const indexB = messageIndex.get(b.message.id);
    if (indexA !== undefined && indexB !== undefined) {
      return indexA - indexB;
    }
    if (indexA !== undefined) return -1;
    if (indexB !== undefined) return 1;
    if (a.pinnedAt !== b.pinnedAt) {
      return a.pinnedAt - b.pinnedAt;
    }
    return a.message.id.localeCompare(b.message.id);
  });

  const pinnedIds: string[] = [];
  const ordered: UIMessage[] = [];

  const existingMessagesById = new Map<string, UIMessage>();
  baseMessages.forEach((message) => {
    if (message?.id) existingMessagesById.set(message.id, message);
  });

  sortedPins.forEach((pin) => {
    const candidate = existingMessagesById.get(pin.message.id) ?? pin.message;
    if (!candidate?.id) return;
    if (pinnedIds.includes(candidate.id)) return;
    ordered.push(candidate);
    pinnedIds.push(candidate.id);
  });

  return { ordered, pinnedIds };
}

function buildArtifactMessages(artifacts: CompressionArtifact[]): UIMessage[] {
  if (artifacts.length === 0) return [];
  return artifacts.map((artifact) =>
    ({
      id: `${ARTIFACT_MESSAGE_PREFIX}-${artifact.id}`,
      role: "system",
      parts: [
        {
          type: "text",
          text: artifact.summary,
        } as UIMessage["parts"][number],
      ],
    } as UIMessage)
  );
}

function resolveSurvivingMessageIds(
  baseMessages: UIMessage[],
  snapshot: CompressionSnapshot | null
): string[] {
  if (!snapshot) {
    return baseMessages.map((message) => message.id).filter(Boolean);
  }

  const snapshotId = snapshot.id;
  const survivorSet = new Set(
    Array.isArray(snapshot.survivingMessageIds)
      ? snapshot.survivingMessageIds.filter(Boolean)
      : []
  );
  const excludedSet = new Set(
    Array.isArray(snapshot.excludedMessageIds)
      ? snapshot.excludedMessageIds.filter(Boolean)
      : []
  );
  const hasExplicitSurvivors = survivorSet.size > 0;
  const ordered: string[] = [];
  const seen = new Set<string>();

  baseMessages.forEach((message) => {
    const id = message?.id;
    if (!id || seen.has(id)) return;

    if (excludedSet.has(id)) {
      return;
    }

    if (survivorSet.has(id)) {
      ordered.push(id);
      seen.add(id);
      return;
    }

    const metadata = getCompressionMessageCompressionState(message);
    const matchesSnapshot = metadata?.snapshotId === snapshotId;
    const isExcluded = matchesSnapshot && metadata?.surviving === false;
    if (isExcluded) {
      return;
    }

    if (!matchesSnapshot || !hasExplicitSurvivors) {
      ordered.push(id);
      seen.add(id);
    }
  });

  return ordered;
}

export function buildCompressionPayload({
  baseMessages,
  pinnedMessages,
  artifacts,
  snapshot,
  config,
}: BuildCompressionPayloadInput): BuildCompressionPayloadResult {
  const { ordered: pinnedOrdered, pinnedIds } = resolvePinnedMessages(
    baseMessages,
    pinnedMessages
  );
  const artifactMessages = buildArtifactMessages(artifacts);
  const survivingIds = resolveSurvivingMessageIds(baseMessages, snapshot);

  const seen = new Set<string>();
  const pinnedSet = new Set(pinnedIds);

  const baseMessagesById = new Map<string, UIMessage>();
  baseMessages.forEach((message) => {
    if (message?.id) baseMessagesById.set(message.id, message);
  });

  const survivingMessages: UIMessage[] = [];
  survivingIds.forEach((id) => {
    if (!id) return;
    if (pinnedSet.has(id)) return;
    const message = baseMessagesById.get(id);
    if (!message) return;
    if (seen.has(id)) return;
    survivingMessages.push(message);
    seen.add(id);
  });

  const messages = [...pinnedOrdered, ...survivingMessages, ...artifactMessages];
  const survivingUnpinnedIds = survivingMessages
    .map((message) => message.id)
    .filter((id): id is string => Boolean(id));

  const pinnedTokens = calculateTokensForMessages(pinnedOrdered);
  const survivingTokens = calculateTokensForMessages(survivingMessages);
  const artifactTokens = calculateTokensForArtifacts(artifacts);
  const totalTokens = pinnedTokens + survivingTokens + artifactTokens;

  const usage: CompressionUsage = {
    totalTokens,
    pinnedTokens,
    artifactTokens,
    survivingTokens,
    updatedAt: Date.now(),
  };

  let shouldCompress = false;
  let overBudget = false;

  const budget =
    typeof config.maxTokenBudget === "number" && Number.isFinite(config.maxTokenBudget)
      ? config.maxTokenBudget
      : null;

  if (budget !== null) {
    usage.budget = budget;
    usage.remainingTokens = Math.max(budget - totalTokens, 0);
    if (budget > 0) {
      overBudget = totalTokens > budget;
    } else if (budget === 0) {
      overBudget = totalTokens > 0;
    } else {
      overBudget = true;
    }
  }

  if (config.enabled) {
    if (budget !== null) {
      if (budget <= 0) {
        shouldCompress = totalTokens > 0;
      } else {
        const threshold = Math.min(
          Math.max(config.compressionThreshold, 0),
          1
        );
        const ratio = totalTokens / budget;
        shouldCompress = ratio >= threshold;
      }
    } else {
      shouldCompress = false;
    }

    if (overBudget) {
      shouldCompress = true;
    }
  } else {
    shouldCompress = false;
  }

  return {
    messages,
    pinnedMessageIds: pinnedIds,
    artifactIds: artifacts.map((artifact) => artifact.id),
    survivingMessageIds: [...pinnedIds, ...survivingUnpinnedIds],
    usage,
    shouldCompress,
    overBudget,
  };
}
