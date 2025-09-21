import type { UIMessage } from "ai";

export const MESSAGE_BRANCH_METADATA_KEY = "acbMessageBranches" as const;

export interface MessageBranchVersion {
  id: string;
  parts: UIMessage["parts"];
  timestamp: number;
}

export interface MessageBranchMetadata {
  versions: MessageBranchVersion[];
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
  const rawVersions = (raw as { versions?: unknown }).versions;
  if (!Array.isArray(rawVersions)) return undefined;

  const versions = rawVersions.filter(isMessageBranchVersion);
  if (versions.length === 0) return undefined;
  return { versions };
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

  const nextVersion: MessageBranchVersion = {
    id: createId(versions.length),
    parts: cloneParts(message.parts),
    timestamp: Date.now(),
  };

  const metadata: MessageBranchMetadata = {
    versions: [...versions, nextVersion],
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
