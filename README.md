# ai-chat-bootstrap (Monorepo)

[![npm version](https://img.shields.io/npm/v/ai-chat-bootstrap?color=brightgreen)](https://www.npmjs.com/package/ai-chat-bootstrap)
[![license](https://img.shields.io/npm/l/ai-chat-bootstrap.svg)](./LICENSE)
[![types](https://img.shields.io/badge/types-TypeScript-blue)](https://www.npmjs.com/package/ai-chat-bootstrap)

React UI + hooks for building modern AI chat interfaces fast. Built on top of Vercel AI SDK and AI SDK Elements.

This repository contains:

| Package                | Path                              | Description                                                |
| ---------------------- | --------------------------------- | ---------------------------------------------------------- |
| ai-chat-bootstrap      | `packages/ai-chat-bootstrap`      | Distributable component & hooks library (published to npm) |
| ai-chat-bootstrap-demo | `packages/ai-chat-bootstrap-demo` | Next.js demo app showcasing the library                    |

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
pnpm add ai-chat-bootstrap
# or
npm install ai-chat-bootstrap
```

Consume styles using one of two modes:

Zero‑config (recommended):

```css
/* globals.css */
@import "ai-chat-bootstrap/tokens.css"; /* design tokens + minimal globals */
@import "ai-chat-bootstrap/ai-chat.css"; /* minimal utility slice used by components */
```

Tailwind‑native (advanced / dedupe with your own utilities):

```ts
// tailwind.config.ts
import preset from "ai-chat-bootstrap/tailwind.preset";

export default {
  presets: [preset],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ai-chat-bootstrap/lib/**/*.{js,ts,jsx,tsx}",
  ],
};
```

In Tailwind‑native mode do NOT import `ai-chat.css`—your build will generate the needed classes. Pick one mode; don't use both.

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

## Features

- Chat container + message rendering primitives
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
useAIContext("counter", counter);
useAIContext("userProfile", { name: user.name, role: user.role });
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

- chat: result of `useAIChat` (preferred). When provided, the container wires sending and loading automatically.
- inputProps: control the input manually
  - value, onChange, onSubmit, onAttach
- header: title, subtitle, avatar, status, badge, actions, className
- ui: placeholder, className, classes.{header,messages,message,input}, emptyState
- suggestions: enabled, prompt, count, onAssistantFinish(triggerFetch), onSendMessage
- commands: enabled, onExecute(commandName, args?), onAICommandExecute(message, toolName, systemPrompt?)
- state: messages, isLoading, status (use when not passing `chat`)

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
