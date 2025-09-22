import type { UIMessage } from "ai";

export const MESSAGE_BRANCH_METADATA_KEY = "acbMessageBranches" as const;

export interface MessageBranchVersion {
  id: string;
  parts: UIMessage["parts"];
  timestamp: number;
}

export interface MessageBranchMetadata {
  versions: MessageBranchVersion[];
  sequence?: number;
}

function isMessageBranchVersion(candidate: unknown): candidate is MessageBranchVersion {
  if (!candidate || typeof candidate !== "object") return false;
  const value = candidate as Partial<MessageBranchVersion>;
  return (
    typeof value.id === "string" &&
    Array.isArray(value.parts) &&
    typeof value.timestamp === "number"
  );
}

export function getMessageBranchMetadata(message: UIMessage): MessageBranchMetadata | undefined {
  const metadata = message.metadata as Record<string, unknown> | undefined;
  if (!metadata) return undefined;
  const raw = metadata[MESSAGE_BRANCH_METADATA_KEY];
  if (!raw || typeof raw !== "object") return undefined;
  const rawRecord = raw as {
    versions?: unknown;
    sequence?: unknown;
  };
  const rawVersions = rawRecord.versions;
  if (!Array.isArray(rawVersions)) return undefined;

  const versions = rawVersions.filter(isMessageBranchVersion);
  if (versions.length === 0) return undefined;

  const sequence = rawRecord.sequence;
  const normalizedSequence =
    typeof sequence === "number" && Number.isFinite(sequence)
      ? sequence
      : undefined;

  return normalizedSequence !== undefined
    ? { versions, sequence: normalizedSequence }
    : { versions };
}

function cloneParts(parts: UIMessage["parts"]): UIMessage["parts"] {
  if (!parts) return parts;
  if (typeof structuredClone === "function") {
    return structuredClone(parts);
  }
  return JSON.parse(JSON.stringify(parts)) as UIMessage["parts"];
}

export function appendMessageBranchVersion(
  message: UIMessage,
  createId: (versionCount: number) => string
): { updatedMessage: UIMessage; version: MessageBranchVersion } {
  const existing = getMessageBranchMetadata(message);
  const versions = existing?.versions ?? [];

  const baseSequence =
    typeof existing?.sequence === "number" && Number.isFinite(existing.sequence)
      ? existing.sequence
      : versions.length;

  const nextVersion: MessageBranchVersion = {
    id: createId(baseSequence),
    parts: cloneParts(message.parts),
    timestamp: Date.now(),
  };

  const metadata: MessageBranchMetadata = {
    versions: [...versions, nextVersion],
    sequence: baseSequence + 1,
  };

  return {
    version: nextVersion,
    updatedMessage: {
      ...message,
      metadata: {
        ...(message.metadata ?? {}),
        [MESSAGE_BRANCH_METADATA_KEY]: metadata,
      },
    },
  };
}

export interface PromoteMessageBranchOptions {
  createId?: (versionCount: number) => string;
  timestamp?: number;
}

export interface PromoteMessageBranchResult {
  updatedMessage: UIMessage;
  changed: boolean;
}

const DEFAULT_BRANCH_VERSION_ID = (message: UIMessage) => {
  const baseId = message.id ?? "assistant";
  return (versionCount: number) => `${baseId}::v${versionCount + 1}`;
};

function ensureUniqueVersionId(
  candidate: string,
  existing: MessageBranchVersion[]
): string {
  if (!existing.some((version) => version.id === candidate)) {
    return candidate;
  }
  let suffix = 1;
  let nextId = `${candidate}::alt-${suffix}`;
  while (existing.some((version) => version.id === nextId)) {
    suffix += 1;
    nextId = `${candidate}::alt-${suffix}`;
  }
  return nextId;
}

export function promoteMessageBranch(
  message: UIMessage,
  branchId: string,
  options: PromoteMessageBranchOptions = {}
): PromoteMessageBranchResult {
  if (!message) {
    return { updatedMessage: message, changed: false };
  }

  if (!branchId || branchId === message.id) {
    return { updatedMessage: message, changed: false };
  }

  const metadata = getMessageBranchMetadata(message);
  if (!metadata || metadata.versions.length === 0) {
    return { updatedMessage: message, changed: false };
  }

  const promotedIndex = metadata.versions.findIndex(
    (version) => version.id === branchId
  );
  if (promotedIndex === -1) {
    return { updatedMessage: message, changed: false };
  }

  const promotedVersion = metadata.versions[promotedIndex];
  const remainingVersions = metadata.versions.filter(
    (version) => version.id !== branchId
  );

  const baseSequence =
    typeof metadata.sequence === "number" && Number.isFinite(metadata.sequence)
      ? metadata.sequence
      : metadata.versions.length;

  const createId = options.createId ?? DEFAULT_BRANCH_VERSION_ID(message);
  const timestamp = options.timestamp ?? Date.now();

  const generatedId = createId(baseSequence);
  const demotedVersion: MessageBranchVersion = {
    id: ensureUniqueVersionId(generatedId, remainingVersions),
    parts: cloneParts(message.parts),
    timestamp,
  };

  const nextMetadata: MessageBranchMetadata = {
    versions: [...remainingVersions, demotedVersion],
    sequence: baseSequence + 1,
  };

  const updatedMessage: UIMessage = {
    ...message,
    parts: cloneParts(promotedVersion.parts),
    metadata: {
      ...(message.metadata ?? {}),
      [MESSAGE_BRANCH_METADATA_KEY]: nextMetadata,
    },
  };

  return {
    updatedMessage,
    changed: true,
  };
}

export function buildBranchMessages(
  message: UIMessage
): { versions: MessageBranchVersion[]; branches: UIMessage[] } {
  const existing = getMessageBranchMetadata(message);
  const baseVersions = existing?.versions ?? [];
  const branches = baseVersions.map((version) => ({
    ...message,
    id: version.id,
    parts: version.parts,
  }));
  branches.push(message);
  return { versions: baseVersions, branches };
}
