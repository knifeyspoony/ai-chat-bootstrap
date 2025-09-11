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

### Local / Development Testing of the CLI

When iterating on the CLI locally (before publishing to npm) you can instruct the scaffold to use a local build of `ai-chat-bootstrap` instead of downloading from the registry.

1. Build the package so `dist/` exists:

```bash
pnpm --filter ai-chat-bootstrap build
```

2. From anywhere (e.g. repo root) run the CLI with `--local` pointing at the package directory:

```bash
node packages/ai-chat-bootstrap/bin/cli.js init demo-local --local packages/ai-chat-bootstrap
# or via npx after a local `pnpm link --global` (optional)
```

You can also set an env var:

```bash
AI_CHAT_BOOTSTRAP_LOCAL=packages/ai-chat-bootstrap node packages/ai-chat-bootstrap/bin/cli.js init demo-local
```

3. The installer will run `npm install ai-chat-bootstrap@file:/abs/path/...` so changes you rebuild will be reflected when you reinstall.

Notes:

- The path may be absolute or relative (relative is resolved from the scaffold working dir's parent).
- Re-run the build after code changes to update the local `dist/` consumed by newly scaffolded apps.
- If install fails with `ENOENT` ensure the path is correct and `dist/` exists.

This avoids publishing every tweak just to validate scaffold behavior.

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

### Layered Tokens

You can opt into granular layers instead of the aggregate `tokens.css`:

```ts
import "ai-chat-bootstrap/tokens.primitives.css"; // primitive scales
import "ai-chat-bootstrap/tokens.semantic.css"; // semantic mapping
import "ai-chat-bootstrap/tokens.dark.css"; // dark overrides (optional)
import "ai-chat-bootstrap/tokens.css"; // component hooks + globals only
```

If you import the first three, you may skip the aggregate and copy just the needed hooks into your own stylesheet.

## Theming & Customization

You can override any chat UI styling via CSS variables, data attributes, or the optional Tailwind plugin.

### 1. Quick token override

```css
.my-chat-scope {
  --acb-chat-container-bg: oklch(0.98 0.01 250);
  --acb-chat-header-bg: oklch(0.96 0.02 250);
  --acb-chat-message-assistant-bg: oklch(0.95 0.03 250);
  --acb-chat-message-user-bg: oklch(0.62 0.17 275);
  --acb-chat-message-radius: 1.25rem;
}
```

Wrap your chat:

```tsx
<div className="my-chat-scope">
  <ChatContainer chat={chat} />
</div>
```

### 2. Data attribute targeting

All structural parts expose `data-acb-part`:

```
[data-acb-part="container"], [data-acb-part="header"], [data-acb-part="message"],
[data-acb-part="message-content"], [data-acb-part="message-avatar"],
[data-acb-part="tool"], [data-acb-part="tool-header"], [data-acb-part="tool-output"],
[data-acb-part="reasoning"], [data-acb-part="code-block"], [data-acb-part="prompt"] ...
```

Example shadow on user messages:

```css
.my-chat-scope [data-role="user"] [data-acb-part="message-content"] {
  box-shadow: 0 0 0 1px oklch(0.8 0 0 / 0.3);
}
```

### 3. Tailwind plugin utilities

Add the plugin:

```ts
// tailwind.config.ts
import preset from "ai-chat-bootstrap/tailwind.preset";
import acbPlugin from "ai-chat-bootstrap/tailwind.plugin";

export default {
  presets: [preset],
  plugins: [acbPlugin],
};
```

Use utilities (they set CSS vars):

```html
<div
  class="acb-msg-assistant-bg-blue-50 acb-msg-user-bg-indigo-600 acb-msg-radius-lg"
>
  <!-- chat -->
</div>
```

All utilities start with `acb-` and map to a CSS variable; color values come from your Tailwind theme.

### 4. Scoped theme switching

```tsx
<div
  data-acb-theme="alt"
  className="[--acb-chat-container-bg:oklch(0.15_0.02_250)] [--acb-chat-header-fg:white]"
>
  <ChatContainer chat={chat} />
</div>
```

### 5. Strategy Ladder

1. Override semantic design tokens (global feel)
2. Override component CSS vars (fine tuning)
3. Target `data-acb-part` for structural styles
4. Use Tailwind plugin utilities for design system integration
5. Unstyled mode: add `data-acb-unstyled` on an ancestor or directly on `ChatContainer` to remove base chrome.

### Available CSS Variable Hooks (summary)

Container: `--acb-chat-container-*`
Header: `--acb-chat-header-*`
Messages: `--acb-chat-message-*-*`, `--acb-chat-message-radius`
Input: `--acb-chat-input-*`, `--acb-prompt-*`
Tools: `--acb-tool-*`
Reasoning: `--acb-reasoning-*`
Code: `--acb-code-*`
Scrollbar: `--acb-scrollbar-*`

> All hooks inherit from base semantic tokens so light/dark just works unless overridden.

## Variant APIs (CVA)

For consumers who prefer composing their own DOM or extending styles, we export class-variance-authority (CVA) helpers. Import the variant builders and merge with your own classes or slot props.

Import:

```ts
import {
  messageVariants,
  promptVariants,
  toolVariants,
  chatContainerVariants,
  codeBlockVariants,
} from "ai-chat-bootstrap/variants";
```

### messageVariants

Variants:

- role: `assistant | user | system | tool | reasoning`
- density: `compact | normal | relaxed`
- avatar: `show | hide`
- radius: `none | sm | md | lg | xl`

Example:

```tsx
<div
  className={messageVariants({
    role: "assistant",
    density: "compact",
    className: "my-extra-styles",
  })}
>
  ...
</div>
```

### promptVariants

- size: `sm | md | lg`
- state: `default | disabled | error`
- toolbar: `inside | below | none`
- density: `compact | normal | relaxed`

### toolVariants

- elevation: `none | sm | md | lg`
- state: `idle | running | error`
- chrome: `full | minimal`

### chatContainerVariants

- layout: `bordered | soft | unstyled`
- density: `compact | normal | relaxed`
- radius: `none | sm | md | lg | xl`
- scrollbar: `subtle | contrast | hidden`

### codeBlockVariants

- lines: `show | hide`
- theme: `auto | light | dark` (forces a theme variant regardless of surrounding context)
- radius: `none | sm | md | lg | xl`

### chatHeaderVariants

- chrome: `default | minimal | clean`
- shadow: `none | sm | md`
- blur: `none | sm | md`
- padding: `sm | md`
- radius: `none | md | lg`
- align: `between | center`
- border: `none | solid`

### promptInputVariants

- chrome: `full | minimal | outline | unstyled`
- shadow: `none | sm | md`
- focusRing: `none | subtle | solid`
- density: `compact | normal | relaxed`
- toolbar: `default | floating | hidden`
- textarea: `soft | flush`

All CVA helpers accept a `className` key to append additional classes.

Why not bake these into components? This keeps runtime weight minimal (no variant prop translation) while still giving downstream users a conventional API shape for composition, especially inside design‑system wrappers or MDX renderers.

If you need additional variant surfaces, open an issue or PR—extending CVA configs is non-breaking.

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
