# AI Chat Bootstrap Workspace Guide

## Monorepo Overview

- Node >=18 and pnpm >=8 are required; install deps once with `pnpm install`.
- The repo is a pnpm workspace containing the distributable library, a Next.js demo, and the public docs site.
- Shared tooling: TypeScript 5, ESLint 9, Vitest 3, Next.js 15, Tailwind 3/4 prereleases, and Shiki for code rendering.

## Packages

### `ai-chat-bootstrap` (library)

- Path: `packages/ai-chat-bootstrap`
- Purpose: Published React component + hooks library for AI chat UIs.
- Dev server: `pnpm --filter ai-chat-bootstrap dev` (watches TypeScript and CSS build).
- Build: `pnpm --filter ai-chat-bootstrap build` -> outputs `dist/` (TS + CSS bundles).
- Tests: `pnpm --filter ai-chat-bootstrap test` (Vitest).
- Lint: `pnpm --filter ai-chat-bootstrap lint`; TypeScript: `pnpm --filter ai-chat-bootstrap typecheck`.
- CSS delivery: import `@import "ai-chat-bootstrap/tokens.css";` and `@import "ai-chat-bootstrap/ai-chat.css";`. A Tailwind preset + plugin are also published for fully custom setups.
- Distribution artifacts: `dist/index.(js|mjs|d.ts)`, `dist/server.*`, `dist/ai-chat.css`, token bundles, Tailwind helpers, CLIs in `bin/`.

### `ai-chat-bootstrap-demo` (demo app)

- Path: `packages/ai-chat-bootstrap-demo`
- Purpose: Next.js showcase that exercises most library features.
- Dev: `pnpm --filter ai-chat-bootstrap-demo dev` (also launches the library watcher and MCP server via `concurrently`).
- Build: `pnpm --filter ai-chat-bootstrap-demo build` (Next.js Turbopack).
- Start prod build: `pnpm --filter ai-chat-bootstrap-demo start`.
- Lint/typecheck: standard Next.js commands (`lint`, `typecheck`).

### `ai-chat-bootstrap-docs` (docs site)

- Path: `packages/ai-chat-bootstrap-docs`
- Purpose: Nextra-powered documentation published to GitHub Pages.
- Dev: `pnpm --filter ai-chat-bootstrap-docs dev`.
- Build: `pnpm --filter ai-chat-bootstrap-docs build` (depends on fresh library build). Static export uses `build:static` to bundle with Pagefind.
- Start prod build: `pnpm --filter ai-chat-bootstrap-docs start`.

## Root Scripts & Tooling

- `pnpm run build`: runs `rebuild` (clean + build library, demo, docs in sequence).
- `pnpm run lint`: ESLint across workspace (uses project-specific configs via flat config chain).
- `pnpm run typecheck`: TypeScript `--noEmit` for every package.
- `pnpm run clean`: workspace-level clean scripts.
- Testing is currently focused on the library (Vitest + jsdom); add new tests under `packages/ai-chat-bootstrap/tests/`.

## Library Conventions

- Use absolute import aliases defined in `tsconfig.json` (no deep relative paths inside `lib/`).
- Zustand actions (`setContext`, etc.) are stable—do not place them in React hook dependency arrays.
- Prefer the shared `cn` utility for class merging; keep components headless where possible.
- CSS usage: choose **one** mode—either import the shipped CSS pair (Zero-config) or adopt the Tailwind preset + plugin (Tailwind-native). Avoid mixing both.
- Add comments sparingly; document intent around complex logic or architectural decisions.
- Keep tokens/theme overrides scoped via CSS variables; do not edit generated CSS in `dist/` directly.

## Building & Publishing the Library

1. Run `pnpm --filter ai-chat-bootstrap clean` to drop `dist/`.
2. Execute `pnpm --filter ai-chat-bootstrap build` to regenerate TypeScript bundles and CSS.
3. Verify with `pnpm --filter ai-chat-bootstrap test` and `pnpm --filter ai-chat-bootstrap lint`.
4. Release workflow uses `pnpm --filter ai-chat-bootstrap release` (runs checks, builds, then publishes to npm with `dist/` contents).

## Testing & QA Tips

- Unit/component tests live in `packages/ai-chat-bootstrap/tests/`; use Vitest + Testing Library where DOM interaction is required.
- Demo & docs rely on Next.js integration tests (not yet automated); spot-check via `pnpm --filter ... dev` before major pushes.
- When updating styles, validate both Zero-config (`demo`) and Tailwind-native (`docs` playgrounds) paths.

## Helpful References

- Library README: `packages/ai-chat-bootstrap/README.md`
- Demo entry point: `packages/ai-chat-bootstrap-demo/src/app/page.tsx`
- Docs index: `packages/ai-chat-bootstrap-docs/src/content/index.mdx`
