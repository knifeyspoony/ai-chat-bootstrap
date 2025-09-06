# ai-chat-bootstrap

[![npm version](https://img.shields.io/npm/v/ai-chat-bootstrap?color=brightgreen)](https://www.npmjs.com/package/ai-chat-bootstrap)
[![license](https://img.shields.io/npm/l/ai-chat-bootstrap.svg)](../../LICENSE)
[![types](https://img.shields.io/badge/types-TypeScript-blue)](https://www.npmjs.com/package/ai-chat-bootstrap)

React UI + hooks for building modern AI chat interfaces fast. Built on top of Vercel AI SDK and AI SDK Elements.

## Install

```bash
pnpm add ai-chat-bootstrap
# or
npm install ai-chat-bootstrap
# or
yarn add ai-chat-bootstrap
```

Add the stylesheet (Tailwind preprocessed) once in your app entry:

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
      {/* Message list auto-renders via ChatMessages component if used */}
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
- Slash command system with parameter schema (zod)
- Frontend tool registration (execute functions client side)
- Context sharing hooks (inject dynamic UI state as model context)
- Focus/selection tracking for contextual relevance
- AI suggestion queue + UI components
- Reasoning / tool / sources / code block message parts
- Tailwind + shadcn/ui base components

## CSS / Theming

The distributed CSS is pre-built. You can override via Tailwind layers or write custom classes. The build marks CSS as sideEffect so bundlers preserve it.

## Tree-shaking

ESM (`module`) and CJS (`main`) builds plus `types` are exported. Subpath export for the stylesheet.

## Peer Dependencies

You must provide React 18+ and react-dom 18+.

## License

MIT

## Repository

Issues & source: https://github.com/knifeyspoony/ai-sdk-chat

## Changelog

See the monorepo root [CHANGELOG](../../CHANGELOG.md) for release notes.
