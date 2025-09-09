# ai-chat-bootstrap

[![npm version](https://img.shields.io/npm/v/ai-chat-bootstrap?color=brightgreen)](https://www.npmjs.com/package/ai-chat-bootstrap)
[![license](https://img.shields.io/npm/l/ai-chat-bootstrap.svg)](../../LICENSE)
[![types](https://img.shields.io/badge/types-TypeScript-blue)](https://www.npmjs.com/package/ai-chat-bootstrap)

Docs: https://knifeyspoony.github.io/ai-chat-bootstrap/

React UI + hooks for building modern AI chat interfaces fast. Built on top of Vercel AI SDK and AI SDK Elements.

## Install

```bash
pnpm add ai-chat-bootstrap
# or
npm install ai-chat-bootstrap
# or
yarn add ai-chat-bootstrap
```

There are two ways to consume styles:

### 1. Zero‑config (fastest)

Import the design tokens _before_ other layers so CSS variables are defined early, then import our prebuilt minimal utility layer (no Tailwind preflight; only the classes our components actually use):

```css
/* globals.css */
@import "ai-chat-bootstrap/tokens.css"; /* tokens & minimal globals */
@import "tailwindcss"; /* (optional) your existing base/util layers */
@import "tw-animate-css"; /* (optional) any other libs */
@import "ai-chat-bootstrap/ai-chat.css"; /* minimal namespaced utility slice */
```

That's it—no need to scan our source or safelist classes. The generated `ai-chat.css` only contains the utilities actually used by the library (preflight disabled, curated so they won't stomp your own config).

Want to theme it? Override the CSS custom properties after importing `tokens.css`:

```css
:root {
  --radius: 0.75rem;
  --primary: oklch(0.58 0.2 264);
  --primary-foreground: oklch(0.985 0 0);
}

.dark {
  --background: oklch(0.16 0 0);
  --foreground: oklch(0.97 0 0);
}
```

> Choose either Zero‑config _or_ Tailwind‑native (below). Don't use both; otherwise you'd duplicate utilities and bloat CSS.

### 2. Tailwind-native (advanced / maximum dedupe)

If you prefer your app's Tailwind build to emit all utilities (allowing shared merging / future purging), **do not import** `ai-chat.css`. Instead, add our preset so tokens resolve and compile classes from your own content:

```ts
// tailwind.config.ts
import preset from "ai-chat-bootstrap/tailwind.preset";

export default {
  presets: [preset],
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
};
```

Monorepo example (include the library source so Tailwind sees the class usage):

```ts
// tailwind.config.ts (app package)
import preset from "ai-chat-bootstrap/tailwind.preset";

export default {
  presets: [preset],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ai-chat-bootstrap/lib/**/*.{js,ts,jsx,tsx}",
  ],
};
```

Most users should start with Zero‑config; switch to Tailwind‑native only if you need maximum deduplication across many internal component libraries or want to merge/tune utilities centrally.

## Quick Start

```tsx
import React from "react";
import { ChatContainer, useAIChat } from "ai-chat-bootstrap";

export function App() {
  const chat = useAIChat({
    api: "/api/chat",
    systemPrompt: "You are a helpful AI assistant.",
  });

  return (
    <ChatContainer
      messages={chat.messages}
      input={chat.input}
      onInputChange={chat.handleInputChange}
      onSubmit={chat.handleSubmit}
      isLoading={chat.isLoading}
    />
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

- `tokens.css` supplies design tokens & minimal global fixes.
- `ai-chat.css` is an optional precompiled minimal utility slice (no preflight) containing only classes our components use.
- The Tailwind preset maps the tokens to theme values if you opt into full Tailwind compilation.
- Override theme by redefining CSS custom properties after importing `tokens.css`.

## Tree-shaking

Only tokens + your generated utilities ship; unused classes are tree‑shaken by your Tailwind build.

## Peer Dependencies

You must provide React 18+ and react-dom 18+.

## License

MIT

## Repository

Issues & source: https://github.com/knifeyspoony/ai-sdk-chat

## Changelog

See the monorepo root [CHANGELOG](../../CHANGELOG.md) for release notes.
