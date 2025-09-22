# Context Compression Development Plan

## Objectives
- Deliver a configurable compression pipeline that preserves chat UX while shrinking the LLM payload.
- Provide end users with transparent controls (pinning, artifact review) for protecting critical context.
- Offer integrators clear hooks for injecting custom summarizers and telemetry.

## Milestones & Tasks

### 1. State & API Foundations
- [ ] Extend `useAIContext` to surface `pinnedMessages`, `compressionArtifacts`, `compressionEvents`, and model metadata (context limit, est. usage).
- [ ] Add `compression` configuration directly to `useAIChat` (flags, budgets, callbacks, custom summarizer) with normalized defaults.
- [ ] Update the LLM payload builder to derive `messages` from pins + surviving turns + artifacts while leaving the UI transcript untouched.

### 2. Pinning UX
- [ ] Render shadcn `Toggle` pin on assistant bubbles (right of assistant, left of user messages).
- [ ] Persist pin/unpin actions to `pinnedMessages`; display pin indicator and enforce optional max pin warning.
- [ ] Ensure pinned turns are always prepended to the LLM payload in chronological order.

### 3. Compression Engine
- [ ] Implement token accounting (Pinned, active turns, artifacts) and threshold checks using `maxTokenBudget` and optional `compressionThreshold`.
- [ ] Ship a default summarizer (LLM prompt or deterministic template) producing artifacts with categories and editable text.
- [ ] Handle failure paths (summarizer errors, provider max-context) with retries and user notifications.

### 4. UX Indicators & Controls
- [ ] Insert compression banner/divider with timestamp in the transcript without trimming history.
- [ ] Add input-row info popover showing model name, token budget, and live usage.
- [ ] Introduce notepad icon (left of suggestions) that opens a bottom sheet listing artifacts; support edit/delete actions syncing to context state.

### 5. Persistence & Host Integration
- [ ] Expose `onCompression` callback payload (tokens saved, artifacts, pins preserved) for analytics or server persistence.
- [ ] Document how to store `pinnedMessages`/artifacts server-side for multi-device continuity.

### 6. Testing & QA
- [ ] Unit tests for pin toggling, payload assembly, artifact CRUD, and compression triggers.
- [ ] Integration tests covering: no pins, multiple pins, artifact edits, compression failure recovery.
- [ ] Manual scenarios: large conversations, mobile view, restoring artifacts after deletion.

## Open Questions
- Should we support multiple compression snapshots (timeline) in v1 or defer until usage insights arrive?
- What default cap (if any) should we apply to pinned messages before warning the user?
- Do we need pluggable artifact renderers for teams that want domain-specific summaries (e.g., tasks vs. decisions)?

## Documentation & Rollout
- Update README + library docs once implementation stabilizes (feature overview, configuration, UX walkthrough).
- Provide migration notes for teams using `useChat` directly (detailing new `setMessages` behavior under compression).
- Announce in release notes with guidance on setting token budgets per provider.
