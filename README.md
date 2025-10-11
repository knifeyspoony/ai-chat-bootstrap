# ai-chat-bootstrap

[![npm version](https://img.shields.io/npm/v/ai-chat-bootstrap?color=brightgreen)](https://www.npmjs.com/package/ai-chat-bootstrap)
[![license](https://img.shields.io/npm/l/ai-chat-bootstrap.svg)](./LICENSE)
[![types](https://img.shields.io/badge/types-TypeScript-blue)](https://www.npmjs.com/package/ai-chat-bootstrap)

React components and hooks that turn AI SDK responses into polished chat experiences in minutes.

- Drop-in chat container with message rendering primitives
- Built-in tooling for commands, suggestions, and tool results
- Works with zero-config CSS or a Tailwind preset, powered by Zustand stores

## Quick Links

- Docs & guides: https://knifeyspoony.github.io/ai-chat-bootstrap/
- Live demo: https://knifeyspoony.github.io/ai-chat-bootstrap/chat/basic-chat
- Development setup: [DEVELOPMENT.md](./DEVELOPMENT.md)
- Changelog: https://github.com/knifeyspoony/ai-sdk-chat/releases

## Install

```bash
pnpm add ai-chat-bootstrap react react-dom ai @ai-sdk/react @ai-sdk/openai zod
```

Swap `@ai-sdk/openai` for your preferred provider. `zod` is recommended for commands and tools.

## Usage

```tsx
import { ChatContainer } from "ai-chat-bootstrap";

export function App() {
  return (
    <ChatContainer
      transport={{ api: "/api/chat" }}
      messages={{ systemPrompt: "You are a helpful AI assistant." }}
    />
  );
}
```

Dig into the docs for styling, advanced patterns, and server helpers.

## License

MIT
