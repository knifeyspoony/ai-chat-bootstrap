# Development Guide

Welcome to the `ai-chat-bootstrap` workspace. This guide walks through checking out the monorepo, installing dependencies, and working with each package during local development.

## Prerequisites

- Node.js 18 or newer
- pnpm 8 or newer (`corepack enable` is recommended)

```bash
pnpm install
```

Run `pnpm install` once after cloning to bootstrap all workspace dependencies.

## Workspace Layout

| Package | Path | Purpose |
| --- | --- | --- |
| `ai-chat-bootstrap` | `packages/ai-chat-bootstrap` | React component + hooks library published to npm. |
| `ai-chat-bootstrap-demo` | `packages/ai-chat-bootstrap-demo` | Next.js demo showcasing the library. |
| `ai-chat-bootstrap-docs` | `packages/ai-chat-bootstrap-docs` | Nextra documentation site deployed to GitHub Pages. |

Shared tooling includes TypeScript 5, ESLint 9, Vitest 3, Next.js 15, Tailwind 3/4 prereleases, and Shiki.

## Common Scripts

Run these from the repository root.

```bash
pnpm run build       # clean + build library, demo, and docs sequentially
pnpm run lint        # ESLint across the workspace
pnpm run typecheck   # TypeScript --noEmit for all packages
pnpm run clean       # remove build artifacts across the workspace
```

### Library (`ai-chat-bootstrap`)

```bash
pnpm --filter ai-chat-bootstrap dev        # watch TypeScript + CSS output
pnpm --filter ai-chat-bootstrap build      # emit dist/ bundles
pnpm --filter ai-chat-bootstrap test       # Vitest suite
pnpm --filter ai-chat-bootstrap lint       # ESLint (library config)
pnpm --filter ai-chat-bootstrap typecheck  # isolated TypeScript check
```

### Demo (`ai-chat-bootstrap-demo`)

```bash
pnpm --filter ai-chat-bootstrap-demo dev   # Next.js dev server + library watcher
pnpm --filter ai-chat-bootstrap-demo build # Next.js Turbopack build
pnpm --filter ai-chat-bootstrap-demo start # serve a production build
```

### Docs (`ai-chat-bootstrap-docs`)

```bash
pnpm --filter ai-chat-bootstrap-docs dev          # docs site with live reload
pnpm --filter ai-chat-bootstrap-docs build        # builds library (via workspace) then Next.js
pnpm --filter ai-chat-bootstrap-docs build:static # bundle docs with Pagefind (after build)
pnpm --filter ai-chat-bootstrap-docs start        # serve the production export
```

## Development Workflow

1. Clone the repo and install dependencies (`pnpm install`).
2. Start the demo or docs dev server depending on what you want to validate.
3. Run targeted builds/tests in the package you are changing.
4. Use `pnpm run build` before publishing or when verifying everything together.

For release prep, use `pnpm --filter ai-chat-bootstrap release`, which runs lint, tests, build, and publishes the library to npm.

## Additional References

- Library docs: `packages/ai-chat-bootstrap/README.md`
- Demo entrypoint: `packages/ai-chat-bootstrap-demo/src/app/page.tsx`
- Public docs index: `packages/ai-chat-bootstrap-docs/src/content/index.mdx`
- Agents integration guide: `AGENTS.md`

Refer to the documentation site for usage guides, API reference, and styling details: https://knifeyspoony.github.io/ai-chat-bootstrap/
