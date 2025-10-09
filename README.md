# ai-chat-bootstrap (Monorepo)

[![npm version](https://img.shields.io/npm/v/ai-chat-bootstrap?color=brightgreen)](https://www.npmjs.com/package/ai-chat-bootstrap)
[![license](https://img.shields.io/npm/l/ai-chat-bootstrap.svg)](./LICENSE)
[![types](https://img.shields.io/badge/types-TypeScript-blue)](https://www.npmjs.com/package/ai-chat-bootstrap)

React UI + hooks for building modern AI chat interfaces fast. Built on top of Vercel AI SDK, Zustand, and AI SDK Elements.

This repository contains:

| Package                | Path                              | Description                                                |
| ---------------------- | --------------------------------- | ---------------------------------------------------------- |
| ai-chat-bootstrap      | `packages/ai-chat-bootstrap`      | Distributable component & hooks library (published to npm) |
| ai-chat-bootstrap-demo | `packages/ai-chat-bootstrap-demo` | Next.js demo app showcasing the library                    |
| ai-chat-bootstrap-docs | `packages/ai-chat-bootstrap-docs` | Documentation site (published to GitHub Pages)             |

---

## Documentation

- Site: https://knifeyspoony.github.io/ai-chat-bootstrap/
- Quick Start: https://knifeyspoony.github.io/ai-chat-bootstrap/chat/basic-chat
- Tools: https://knifeyspoony.github.io/ai-chat-bootstrap/chat/chat-with-tools
- Tool Result Rendering: https://knifeyspoony.github.io/ai-chat-bootstrap/chat/tool-result-rendering
- Focus Items: https://knifeyspoony.github.io/ai-chat-bootstrap/chat/focus-items
- Sharing Context: https://knifeyspoony.github.io/ai-chat-bootstrap/chat/ai-context
- Commands: https://knifeyspoony.github.io/ai-chat-bootstrap/chat/commands
- API Reference: https://knifeyspoony.github.io/ai-chat-bootstrap/api
- Components: https://knifeyspoony.github.io/ai-chat-bootstrap/api/components

## Install (Library)

```bash
pnpm add ai-chat-bootstrap react react-dom ai @ai-sdk/react @ai-sdk/openai zod
# or
npm install ai-chat-bootstrap react react-dom ai @ai-sdk/react @ai-sdk/openai zod
```

Swap `@ai-sdk/openai` for another provider if needed. `zod` recommended for tools/commands.

Peer warning notes:

- React 19 may trigger warnings from packages that have not yet expanded their peer range beyond 18.
- zod v4 may trigger a warning from provider utilities expecting v3; functionality is compatible for typical schemas.

## Styling

The library accepts **shadcn/ui** and **Tailwind** classes naturally, falling back to built-in styles. Two setup modes:

**Zero‑config** (recommended):

```css
/* globals.css */
@import "tw-animate-css";
@import "ai-chat-bootstrap/tokens.css";
@import "ai-chat-bootstrap/ai-chat.css";
```

Install `tw-animate-css` alongside the library so the shared animation keyframes used by popovers, menus, and dialogs stay in sync with our components.

Override the shadcn-compatible tokens outside of any `@layer` block:

```css
:root {
  --radius: 0.75rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.58 0.2 264);
}
```

Copy the complete token set (`--background`, `--card`, `--primary`, etc.) from the CLI scaffold or docs and keep both the light and dark palettes defined—the components reference each value directly.

**Tailwind‑native** (advanced):

```ts
// tailwind.config.ts
import preset from "ai-chat-bootstrap/tailwind.preset";
export default {
  presets: [preset],
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
};
```

Don't use both modes together.

## Quick Start

```tsx
import React from "react";
import { ChatContainer } from "ai-chat-bootstrap";

export function App() {
  return (
    <ChatContainer
      transport={{ api: "/api/chat" }}
      messages={{ systemPrompt: "You are a helpful AI assistant." }}
      header={{ title: "AI Assistant" }}
    />
  );
}
```

## Server Templates

Helper functions make deploying API endpoints easier:

```ts
// app/api/chat/route.ts
import { createAIChatHandler } from "ai-chat-bootstrap/server";
import { openai } from "@ai-sdk/openai";

const handler = createAIChatHandler({
  model: openai("gpt-4"),
  streamOptions: { temperature: 0.7 },
});

export { handler as POST };
```

Also available: `createSuggestionsHandler`, `createThreadTitleHandler`, `createMcpToolsHandler`.

## Features

- Chat container + message rendering primitives
- Model selection dropdown with store management
- Chain of thought reasoning display mode
- Slash command system (zod parameter schemas)
- Frontend tool registration (execute functions client-side)
- Automatic context sharing hooks
- Focus/selection tracking for contextual relevance
- AI suggestion queue components
- Reasoning / tool / sources / code block message parts
- Tailwind + shadcn/ui base components

## Hooks Examples

Context sharing:

```tsx
import { useAIContext } from "ai-chat-bootstrap";
useAIContext({ description: "Counter", value: counter });
useAIContext({
  description: "User Profile",
  value: { name: user.name, role: user.role },
});
```

Frontend tool:

```tsx
import { useAIFrontendTool } from "ai-chat-bootstrap";
useAIFrontendTool({
  name: "increment_counter",
  description: "Increment the demo counter",
  parameters: z.object({ amount: z.number().default(1) }),
  execute: async ({ amount }) => {
    setCounter((c) => c + amount);
    return { newValue: counter + amount };
  },
});
```

Focus tracking:

```tsx
import { useAIFocus } from "ai-chat-bootstrap";
const { setFocus, clearFocus } = useAIFocus();
```

Slash command:

```tsx
import { useAIChatCommand } from "ai-chat-bootstrap";
useAIChatCommand({
  name: "reset",
  description: "Reset state",
  parameters: z.object({}),
  execute: async () => resetAll(),
});
```

## Message Format

Messages follow the AI SDK UIMessage shape with multiple part types (`text`, `reasoning`, `file`, `source-url`, `tool-*`, `data-*`).

## CSS / Theming

- `tokens.css` provides CSS custom properties (colors, radius, etc.) and minimal global tweaks.
- `ai-chat.css` is an optional precompiled, no‑preflight utility slice containing only classes the library uses.
- The Tailwind preset maps those tokens so you can compile utilities in your own build instead of importing `ai-chat.css`.
- Override theme by redefining the custom properties after importing `tokens.css`.

Full styling docs live in `packages/ai-chat-bootstrap/README.md`.

## ChatContainer props

**Transport & messages:**

- `transport.api`: chat endpoint (defaults to `/api/chat`)
- `messages.systemPrompt`: optional system prompt string
- `messages.initial`: seed `UIMessage[]` on mount

**Thread management:**

- `thread.id`: control which persisted thread to load/continue
- `thread.scopeKey`: partition threads (e.g. per-document)
- `thread.autoCreate`: create a thread automatically when missing (`true`)
- `thread.warnOnMissing`: emit console warning when a thread can't be loaded
- `thread.title.api`: endpoint to auto-title threads (empty string disables)
- `thread.title.sampleCount`: number of recent messages to include when generating titles

**Features & models:**

- `features.chainOfThought`: surface reasoning traces when available
- `models.available`: array of model choices for the built-in selector
- `models.initial`: preferred model id to select initially

**MCP integrations:**

- `mcp.enabled`: toggle MCP support
- `mcp.api`: override the MCP bridge endpoint
- `mcp.servers`: preconfigure MCP servers (serialized descriptors)

**UI configuration:**

- `header`: title, subtitle, avatar, badge, actions, className
- `ui`: placeholder, className, classes (`header`, `messages`, `message`, `input`, `assistantActions`), emptyState
- `suggestions`: `{ enabled, prompt, count }`
- `commands`: `{ enabled }`
- `threads`: `{ enabled }`
- `assistantActions`: enable built-ins (`copy`, `regenerate`, `debug`, `feedback`) and supply custom `AssistantAction[]`

Example enabling suggestions and commands:

```tsx
<ChatContainer
  transport={{ api: "/api/chat" }}
  messages={{ systemPrompt: "You are a helpful AI assistant." }}
  suggestions={{ enabled: true, count: 3 }}
  commands={{ enabled: true }}
/>
```

## Development (Monorepo)

```bash
pnpm install              # install all workspace deps
pnpm run dev              # runs demo app (and any watch scripts)
pnpm run build:lib        # build library (ai-chat-bootstrap)
pnpm run lint             # eslint across workspace
pnpm run typecheck        # typecheck all packages
```

Targeted:

```bash
pnpm --filter ai-chat-bootstrap build
pnpm --filter ai-chat-bootstrap-demo dev
```

Clean & rebuild library only:

```bash
pnpm rebuild:lib
```

## Publishing

See `PUBLISH.md` for the full checklist. Quick sequence:

```bash
pnpm --filter ai-chat-bootstrap lint && \
pnpm --filter ai-chat-bootstrap typecheck && \
pnpm --filter ai-chat-bootstrap build && \
cd packages/ai-chat-bootstrap && npm publish --access public
```

After publish: tag & push.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history.

## Project Structure

Key folders inside `ai-chat-bootstrap`:

- `lib/components` React components
- `lib/hooks` React hooks
- `lib/stores` Zustand stores
- `lib/types` shared TypeScript types
- `dist/` build output (generated)

## Tech Stack

- React 19
- Vercel AI SDK 5
- TypeScript 5
- Tailwind + shadcn/ui
- Zustand + zod

## Contributing

1. Create a branch
2. Make changes + ensure build & lint pass
3. Open PR

## License

MIT
