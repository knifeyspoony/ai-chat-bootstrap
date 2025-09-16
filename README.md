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
@import "ai-chat-bootstrap/tokens.css";
@import "ai-chat-bootstrap/ai-chat.css";
```

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
import { ChatContainer, useAIChat } from "ai-chat-bootstrap";

export function App() {
  const chat = useAIChat({
    api: "/api/chat",
    systemPrompt: "You are a helpful AI assistant.",
  });

  return <ChatContainer chat={chat} header={{ title: "AI Assistant" }} />;
}
```

## Server Templates

New helper functions make deploying API endpoints easier:

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
- **Model selection** dropdown with store management
- **Chain of thought** reasoning display mode
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

**Required:**

- `chat`: result of `useAIChat` hook (handles all state and actions)

**Optional:**

- `header`: title, subtitle, avatar, badge, actions, className
- `ui`: placeholder, className, classes (`header`, `messages`, `message`, `input`, `assistantActions`), emptyState
- `suggestions`: enabled, prompt, count
- `commands`: enabled
- `threads`: enabled
- `assistantActions`: controls rendered beneath each assistant reply; accepts a node or `(message) => node` and appears by default on the latest response (earlier responses reveal on hover/focus)
- `assistantLatestActions`: extra controls only appended to the most recent assistant reply (e.g. retry buttons)

Example controlled input:

```tsx
<ChatContainer chat={chat} inputProps={{ value: input, onChange: setInput }} />
```

Enable suggestions and commands:

```tsx
<ChatContainer
  chat={chat}
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
