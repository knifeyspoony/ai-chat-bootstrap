import type { AssistantBranchEntry } from './assistant-branches';

export interface ReorderBranchEntriesOptions {
  entries: AssistantBranchEntry[];
  messageId?: string;
  branchingEnabled: boolean;
  selectedBranchIndex?: number;
}

export function reorderBranchEntriesForSelection({
  entries,
  messageId,
  branchingEnabled,
  selectedBranchIndex,
}: ReorderBranchEntriesOptions): AssistantBranchEntry[] {
  if (!branchingEnabled) {
    return entries;
  }

  if (!entries.length) {
    return entries;
  }

  if (!messageId) {
    return entries;
  }

  if (
    typeof selectedBranchIndex !== 'number' ||
    !Number.isFinite(selectedBranchIndex)
  ) {
    return entries;
  }

  const canonicalIndex = entries.findIndex(
    (entry) => entry.message.id === messageId
  );

  if (canonicalIndex === -1) {
    return entries;
  }

  const clampedIndex = Math.max(
    0,
    Math.min(entries.length - 1, Math.trunc(selectedBranchIndex))
  );

  if (canonicalIndex === clampedIndex) {
    return entries;
  }

  const reordered = entries.slice();
  const [canonicalEntry] = reordered.splice(canonicalIndex, 1);
  reordered.splice(clampedIndex, 0, canonicalEntry);
  return reordered;
}
