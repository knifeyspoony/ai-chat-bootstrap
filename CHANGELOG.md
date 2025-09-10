# Changelog

All notable changes to this project will be documented in this file.

The format loosely follows [Keep a Changelog](https://keepachangelog.com/) and adheres to semantic versioning.

## [0.3.0] - 2025-09-10

### Added

- Automatic `enrichedSystemPrompt` generation in the `useAIChat` hook. Each client request now always includes `enrichedSystemPrompt`.
- Exported `buildEnrichedSystemPrompt` utility for advanced/custom orchestration scenarios.
- Documentation describing enrichment behavior (preamble + conditional Tools / Context / Focus sections + appended original system prompt).
- CLI for scaffolding
- Suggestions architecture (service + store + triggers)

### Changed

- API route logic and scaffold templates now prioritize `enrichedSystemPrompt` over `systemPrompt` (`enrichedSystemPrompt || systemPrompt || fallback`).
- Frontend always sends an enriched system prompt; no disable flag is provided (design decision to ensure consistent model guidance).
- Truncation safeguard added: preserves preamble head and original system prompt tail if prompt exceeds internal `maxChars`.

### Migration Notes

- Prefer `enrichedSystemPrompt` downstream. Keep fallback chain: `enrichedSystemPrompt || systemPrompt || "your fallback"`.
- Remove any manual concatenation of context/focus/tool descriptions you previously appended to `systemPrompt`; this is now automatic.
- Your existing `systemPrompt` (if provided) is still appended verbatim within the enriched version—no breaking change for prior content.
- To fully override enrichment for a single call, pass a custom `body.enrichedSystemPrompt` in `sendMessage`.
- Avoid re‑enriching on the server; double enrichment will produce redundant sections.
- Logging: if you log resolved system prompts, redact sensitive context before persistence since more structured data is now present.

## [0.2.1] - 2025-09-10

### Changed

- Added docs!

- Revamped styling distribution: replaced monolithic `dist/styles.css` with granular exports:
  - `tokens.css` (design tokens + minimal globals, no preflight)
  - `ai-chat.css` (optional precompiled minimal utility slice containing only library-used classes, preflight disabled)
  - `tailwind.preset` (enables Tailwind-native mode so consumers can compile utilities themselves and skip `ai-chat.css`).
- Updated documentation (root and package READMEs) to describe two consumption modes (Zero‑config vs Tailwind‑native) and clarified they are mutually exclusive.

### Removed

- Deprecated `dist/styles.css` (no longer published) to prevent stomping downstream Tailwind configs and reduce unused CSS.

### Migration Notes

- If you previously imported `ai-chat-bootstrap/dist/styles.css`, replace it with either:
  - Zero‑config: `@import "ai-chat-bootstrap/tokens.css"; @import "ai-chat-bootstrap/ai-chat.css";`
  - Tailwind‑native: add `import preset from "ai-chat-bootstrap/tailwind.preset";` in `tailwind.config.{js,ts}` and ensure the library's `lib` directory is in your `content` paths.
    Do not combine the two approaches.

## [0.3.0] - 2025-09-10

### Changed

- Promoted `ai` and `@ai-sdk/react` to peer dependencies to prevent duplicate AI SDK instances and give consumers version control.

### Added

- Updated `packages/ai-chat-bootstrap/README.md` install instructions showing explicit peer install command.
- Migration note clarifying required manual installs when upgrading from <=0.2.x.

### Migration Notes

- Install peers in your app: `react react-dom ai @ai-sdk/react` (plus a provider like `@ai-sdk/openai`).
- If you previously relied on transitive `ai` installation, add it explicitly now.
- No code changes required unless your bundler depended on single copies deduped automatically; this change reduces risk of mismatched minor versions at runtime.
- Demo app updated to include explicit `@ai-sdk/react` dependency and bumped to 0.3.0 for alignment.
- Docs site updated (install snippets now list required peers; version bumped to 0.3.0).

## [0.3.1] - 2025-09-10

### Added

- New CLI scaffold: `npx ai-chat-bootstrap init [project] [--tailwind-native]` creates a Next.js app with preconfigured dependencies, `/api/chat` route, `/chat` page, and styling setup.

### Notes

- CLI added as bin `ai-chat-bootstrap` in package. Marked minor bump.

## [0.3.3] - 2025-09-10

### Changed

- Refactored CLI templates into separate files (`bin/core/templates/*`) for maintainability. No functional changes.

## [0.3.4] - 2025-09-10

### Security

- Bumped `react-syntax-highlighter` to `^15.6.6` (transitively updates `refractor` / `prismjs` path) to mitigate PrismJS DOM clobbering advisory (GHSA-x7hr-w5r2-h6wg). No runtime API changes expected.

## [0.1.0] - 2025-09-06

### Added

- Initial public release of `ai-chat-bootstrap` library.
- Core chat UI components (container, input, messages, message parts).
- Hooks: context sharing, focus tracking, frontend tools, suggestions, chat command system.
- Tool & reasoning message part rendering.
- Pre-built Tailwind CSS bundle (`dist/styles.css`).
- Publishing guide (`PUBLISH.md`).

### Infrastructure

- Monorepo setup with pnpm workspaces.
- Build pipeline using `tsdown` and custom CSS build script.
- ESLint + TypeScript configuration.

## Future

- Add test coverage (unit + integration for hooks).
- Extend message part types (images, tables, inline citations).
- Provide optional shadcn/ui theme generator.
