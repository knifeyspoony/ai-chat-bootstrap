# Branching TODO

## Goal
When a user switches to an alternate branch of an assistant response, that branch becomes the canonical message fed into subsequent LLM payloads and the compression pipeline. Branch metadata should still retain prior variants so the user can revisit or switch again, but only the currently selected branch should influence token accounting, summarisation, and future turns.

## Proposed Plan

### 1. Track Selected Branch State
- Store branch selections keyed by message id in a dedicated Zustand store (either extend `useAICompressionStore` or add a `useAIBranchesStore`).
- Persist the selection when the user switches branches; the store needs actions like `setSelectedBranch(messageId, branchId)`.
- Make the branch picker consume and update this state instead of keeping it local (`Branch` component should read/write via context → store).

### 2. Canonical Message Mutation
- On branch change, materialise the selected branch as the primary message:
  - Clone the `UIMessage` with the chosen branch `parts` and updated metadata reflecting remaining branches.
  - Replace the entry inside the chat store (thread messages + live `chatHook.messages`).
  - Ensure undo safety (keep the other branches inside metadata so branch selector can still render them).
- Provide utilities in `message-branches.ts` to promote/demote branches (e.g., `promoteBranch(message, branchId)` returning new canonical + updated metadata).

### 3. Compression + Payload Integration
- `useAIChatCompression` should operate on the mutated canonical message array automatically since the chat store now holds the active branch.
- When building compression payloads, ensure pinned ids survive branch promotion (i.e., keep the original message id constant).
- Update summariser tests to confirm branch switching alters token counts and surviving ids.

### 4. Persistence & History
- Persist branch selection in thread storage so rehydrating a thread restores the chosen branch.
- Decide how to handle resurrected branches (e.g., if user edits the canonical branch, stash the previous canonical version back into metadata).

### 5. UI Considerations
- Branch selector should highlight which version is active (maybe "Current" tag).
- Disable branch switching while the assistant is streaming to avoid race conditions.

### 6. Migration / Backwards Compatibility
- For existing transcripts without branch selection state, default to the last branch (current behaviour).
- Add development warnings if branch selection fails to mutate the store.

## Open Questions
- Do we allow branch selection for user messages or only assistant messages?
- Should pinning apply to individual branch versions or always to the canonical message id?
- How do we reconcile branch promotion when the assistant re-streams new content (auto-merge or reset branch history)?

## Testing
- Unit tests: promoting branches, switching back and forth, persistence roundtrip.
- Integration: simulate conversation with branch swap between assistant turns and verify payload delivered to `sendMessage` contains the new branch parts.
