import type {
  CompressionArtifact,
  CompressionController,
  CompressionModelMetadata,
  CompressionSnapshot,
  CompressionUsage,
  PersistedCompressionState,
} from "../../types/compression";

function cloneSnapshot(snapshot: CompressionSnapshot): CompressionSnapshot {
  return {
    ...snapshot,
    survivingMessageIds: [...snapshot.survivingMessageIds],
    artifactIds: [...snapshot.artifactIds],
    excludedMessageIds: snapshot.excludedMessageIds
      ? [...snapshot.excludedMessageIds]
      : undefined,
  };
}

function cloneArtifact(artifact: CompressionArtifact): CompressionArtifact {
  return {
    ...artifact,
    sourceMessageIds: artifact.sourceMessageIds
      ? [...artifact.sourceMessageIds]
      : undefined,
  };
}

function cloneUsage(usage: CompressionUsage): CompressionUsage {
  return { ...usage };
}

function cloneMetadata(
  metadata: CompressionModelMetadata | null
): CompressionModelMetadata | null {
  if (!metadata) return null;
  return { ...metadata };
}

export function clonePersistedCompressionState(
  state: PersistedCompressionState | null
): PersistedCompressionState | null {
  if (!state) return null;
  return {
    snapshot: state.snapshot ? cloneSnapshot(state.snapshot) : null,
    artifacts: state.artifacts.map(cloneArtifact),
    usage: state.usage ? cloneUsage(state.usage) : null,
    metadata: cloneMetadata(state.metadata),
    shouldCompress: state.shouldCompress,
    overBudget: state.overBudget,
    updatedAt: state.updatedAt,
  };
}

export function buildPersistedCompressionState(
  controller: CompressionController
): PersistedCompressionState | null {
  const snapshot = controller.snapshot
    ? cloneSnapshot(controller.snapshot)
    : null;
  const artifacts = controller.artifacts.map(cloneArtifact);
  const usage = controller.usage ? cloneUsage(controller.usage) : null;
  const metadata = cloneMetadata(controller.metadata ?? null);

  if (!snapshot && artifacts.length === 0 && !usage) {
    return null;
  }

  const timestamp =
    usage?.updatedAt ?? snapshot?.createdAt ?? Date.now();

  return {
    snapshot,
    artifacts,
    usage,
    metadata,
    shouldCompress: controller.shouldCompress,
    overBudget: controller.overBudget,
    updatedAt: timestamp,
  };
}
