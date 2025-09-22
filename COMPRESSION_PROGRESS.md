# Context Compression Progress Log

## Current Snapshot (2025-02-16)
- **Summariser online**: default compression summariser now trims history, emits editable artifacts, and updates snapshot/token telemetry end-to-end.
- **Async pipeline**: `useAIChatCompression` runs summarisation automatically when thresholds/budgets hit, records events, and forwards telemetry callbacks.
- **Request payloads**: `useAIChat` now awaits the compression helper so outgoing LLM requests always include surviving message + artifact metadata.
- **Context bridge**: compression controller automatically publishes pins, artifacts, events, and usage metadata through `useAIContext` for host inspection.
- **Compression UI**: chat transcript shows a compression banner, the input row surfaces live token usage, and an artifact drawer allows editing or deleting summaries.
- **Test coverage**: added `tests/utils-compression-default-summarizer.test.ts` to ensure artifact creation, pin preservation, and usage reporting.
- **Branch-aware pins**: selecting an assistant branch now promotes the variant into the transcript and keeps existing pins in sync so compression operates on the active content.

## Completed Milestones
- [x] Add `compression` configuration plumbing to `useAIChat` and expose via the compression store/context.
- [x] Introduce dedicated compression store (`useAICompressionStore`) for pins, artifacts, events, usage, and metadata.
- [x] Implement `buildCompressionPayload` utility to assemble pins + surviving turns + artifacts.
- [x] Refactor `useAIChat` payload builder to consume compression helpers and emit request metadata.
- [x] Ship utility tests covering payload ordering and fallback behaviour.
- [x] Extend compression payload + store with token usage accounting and threshold flags.
- [x] Implement default summariser + automatic snapshot/artifact wiring in `useAIChatCompression`.
- [x] Ensure chat transport awaits compression builder so payload metadata stays in sync.

## In-Progress / Planned Next
- [x] Expose compression state through `useAIContext` so host apps can read pins, artifacts, events, and model metadata.
- [x] Build the remaining UI: compression banner, usage popover, and artifact drawer with edit/delete flows wired to controller actions.
- [ ] Handle error telemetry end-to-end (summarizer failure UX, `onCompression`/`onError` docs, persistence guidance).
- [ ] Broaden automated coverage for pin toggles, artifact CRUD, threshold triggers, and failure recovery scenarios.

## Open Questions
- Multi-snapshot history: still undecided—requires design for timeline UX + storage.
- Pin cap defaults: need heuristic based on budget and message length.
- Artifact rendering: decide whether to support pluggable renderers in v1.

_Last updated by Codex on 2025-02-17._
