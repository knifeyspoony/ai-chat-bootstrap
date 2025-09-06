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

## Install (Library)

```bash
pnpm add ai-chat-bootstrap
# or
npm install ai-chat-bootstrap
```

Add stylesheet once (e.g. in your root layout / entry):

```ts
import "ai-chat-bootstrap/dist/styles.css";
```

## Quick Start

```tsx
import { ChatContainer, ChatInput } from "ai-chat-bootstrap";
import { useChat } from "ai/react";

export function App() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <ChatContainer messages={messages}>
      <ChatInput
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
      />
    </ChatContainer>
  );
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

Distributed CSS is pre-built; override via Tailwind layers or custom classes. The package marks `dist/styles.css` as a side-effect so bundlers keep it.

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
