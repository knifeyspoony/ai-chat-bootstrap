# ai-chat-bootstrap

[![npm version](https://img.shields.io/npm/v/ai-chat-bootstrap?color=brightgreen)](https://www.npmjs.com/package/ai-chat-bootstrap)
[![license](https://img.shields.io/npm/l/ai-chat-bootstrap.svg)](../../LICENSE)
[![types](https://img.shields.io/badge/types-TypeScript-blue)](https://www.npmjs.com/package/ai-chat-bootstrap)

Docs: https://knifeyspoony.github.io/ai-chat-bootstrap/

React UI + hooks for building modern AI chat interfaces fast. Built on top of Vercel AI SDK and AI SDK Elements.

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

## Install

You now need to install required peer dependencies explicitly (React, AI SDK core, React bindings, plus whatever model provider you use):

```bash
pnpm add ai-chat-bootstrap react react-dom ai @ai-sdk/react @ai-sdk/openai zod
# or
npm install ai-chat-bootstrap react react-dom ai @ai-sdk/react @ai-sdk/openai zod
```

If you use a different provider, swap `@ai-sdk/openai` for `@ai-sdk/azure`, `@ai-sdk/google`, etc. `zod` is optional unless you define tool / command schemas (recommended).

There are two ways to consume styles:

### 1. Zero‑config (fastest)

Import the design tokens _before_ other layers so CSS variables are defined early, then import our prebuilt minimal utility layer (no Tailwind preflight; only the classes our components actually use):

```css
/* globals.css */
@import "ai-chat-bootstrap/tokens.css"; /* tokens & minimal globals */
@import "tailwindcss"; /* (optional) your existing base/util layers */
@import "tw-animate-css"; /* (optional) any other libs */
@import "ai-chat-bootstrap/ai-chat.css"; /* minimal namespaced utility slice */
@source "../node_modules/streamdown/dist/index.js"; /* this is a streamdown requirement */
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

  return <ChatContainer chat={chat} header={{ title: "AI Assistant" }} />;
}
```

## CLI Scaffold (New)

Generate a ready-to-run Next.js app with chat + API route:

```bash
npx ai-chat-bootstrap@latest init my-chat-app
```

Tailwind-native mode (no prebuilt utility slice):

```bash
npx ai-chat-bootstrap@latest init my-chat-app --tailwind-native
```

What you get:

- Next.js (App Router, TS, Tailwind)
- Installed peers: react, react-dom, ai, @ai-sdk/react, @ai-sdk/openai, zod, ai-chat-bootstrap
- `/api/chat` route with streaming example
- `/chat` page using `ChatContainer`
- Global CSS updated for chosen style mode

Next steps after scaffold:

```bash
cd my-chat-app
npm run dev
```

Visit http://localhost:3000/chat.

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

## Tree-shaking

Only tokens + your generated utilities ship; unused classes are tree‑shaken by your Tailwind build.

## Peer Dependencies

Required (must be installed in your app):

- `react` (>=18)
- `react-dom` (>=18)
- `ai` (>=5)
- `@ai-sdk/react` (>=2)

Why peers? Avoid duplicate React / AI SDK instances and let you control exact versions alongside other AI features in your app.

Optional depending on usage:

- A model/provider package: e.g. `@ai-sdk/openai`, `@ai-sdk/azure`, `@ai-sdk/google`, `@ai-sdk/anthropic` (install one or more you call in your API routes)
- `zod` for tool / command parameter schemas (install if you register tools or commands)

Previously `ai` & `@ai-sdk/react` were bundled as regular dependencies (<=0.2.x). Starting 0.3.0 they are peers—add them to your project if upgrading.

### Peer warning notes

- React 19: Some third-party libs still list peer range up to React 18; pnpm/yarn may show warnings—safe to ignore if functionality works.
- zod v4: Provider utilities may still peer-depend on zod v3; v4 is largely compatible for schemas you author. If you need to silence warnings, pin zod@^3 for now.

## License

MIT

## Repository

Issues & source: https://github.com/knifeyspoony/ai-sdk-chat

## Changelog

See the monorepo root [CHANGELOG](../../CHANGELOG.md) for release notes.
