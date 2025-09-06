# Changelog

All notable changes to this project will be documented in this file.

The format loosely follows [Keep a Changelog](https://keepachangelog.com/) and adheres to semantic versioning.

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
