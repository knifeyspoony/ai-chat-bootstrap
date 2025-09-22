import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAICompressionStore } from "../stores";
import type { CompressionStoreState } from "../stores/compression";
import type {
  CompressionArtifact,
  CompressionController,
  CompressionControllerActions,
  CompressionPinnedMessage,
} from "../types/compression";

function sortPinnedMessages(
  pins: Map<string, CompressionPinnedMessage>
): CompressionPinnedMessage[] {
  const entries = Array.from(pins.values());
  entries.sort((a, b) => {
    if (a.pinnedAt !== b.pinnedAt) {
      return a.pinnedAt - b.pinnedAt;
    }
    return a.message.id.localeCompare(b.message.id);
  });
  return entries;
}

function sortArtifacts(
  artifacts: Map<string, CompressionArtifact>
): CompressionArtifact[] {
  const entries = Array.from(artifacts.values());
  entries.sort((a, b) => {
    const aTime = a.updatedAt ?? a.createdAt;
    const bTime = b.updatedAt ?? b.createdAt;
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    return a.id.localeCompare(b.id);
  });
  return entries;
}

export function useCompressionController(): CompressionController {
  const stateSlice = useAICompressionStore(
    useShallow((state: CompressionStoreState) => ({
      config: state.config,
      pinnedMap: state.pinnedMessages,
      artifactsMap: state.artifacts,
      events: state.events,
      usage: state.usage,
      metadata: state.modelMetadata,
      snapshot: state.lastSnapshot,
      shouldCompress: state.shouldCompress,
      overBudget: state.overBudget,
    }))
  );

  const actions = useAICompressionStore(
    useShallow(
      (state: CompressionStoreState): CompressionControllerActions => ({
        pinMessage: state.pinMessage,
        setPinnedMessages: state.setPinnedMessages,
        unpinMessage: state.unpinMessage,
        clearPinnedMessages: state.clearPinnedMessages,
        addArtifact: state.addArtifact,
        updateArtifact: state.updateArtifact,
        removeArtifact: state.removeArtifact,
        setArtifacts: state.setArtifacts,
        clearArtifacts: state.clearArtifacts,
        recordEvent: state.recordEvent,
        setModelMetadata: state.setModelMetadata,
        setUsage: state.setUsage,
        setSnapshot: state.setSnapshot,
      })
    )
  );

  const pinnedMessages = useMemo(
    () => sortPinnedMessages(stateSlice.pinnedMap),
    [stateSlice.pinnedMap]
  );

  const artifacts = useMemo(
    () => sortArtifacts(stateSlice.artifactsMap),
    [stateSlice.artifactsMap]
  );

  const events = useMemo(() => [...stateSlice.events], [stateSlice.events]);

  return {
    config: stateSlice.config,
    pinnedMessages,
    artifacts,
    events,
    usage: stateSlice.usage,
    metadata: stateSlice.metadata,
    snapshot: stateSlice.snapshot,
    shouldCompress: stateSlice.shouldCompress,
    overBudget: stateSlice.overBudget,
    actions,
  };
}
