# Changelog

All notable changes to this project will be documented in this file.

The format loosely follows [Keep a Changelog](https://keepachangelog.com/) and adheres to semantic versioning.

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
