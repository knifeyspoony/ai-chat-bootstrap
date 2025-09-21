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

Install with required peer dependencies:

```bash
pnpm add ai-chat-bootstrap react react-dom ai @ai-sdk/react @ai-sdk/openai zod
# or
npm install ai-chat-bootstrap react react-dom ai @ai-sdk/react @ai-sdk/openai zod
```

If you use a different provider, swap `@ai-sdk/openai` for `@ai-sdk/azure`, `@ai-sdk/google`, etc. `zod` is optional unless you define tool / command schemas (recommended).

## Styling

The library accepts **shadcn/ui** and **Tailwind** classes naturally, falling back to built-in styles. Two setup modes:

### 1. Zero‑config (recommended)

```css
/* globals.css */
@import "ai-chat-bootstrap/tokens.css";
@import "ai-chat-bootstrap/ai-chat.css";
```

`tokens.css` provides design tokens + minimal globals. `ai-chat.css` layers the chat component styles on top.

To theme, override CSS custom properties:

```css
:root {
  --radius: 0.75rem;
  --primary: oklch(0.58 0.2 264);
}
```

### 2. Tailwind‑native (advanced)

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

Available handlers:

- `createAIChatHandler` - Main chat streaming
- `createSuggestionsHandler` - AI-generated suggestions
- `createThreadTitleHandler` - Auto thread titles
- `createMcpToolsHandler` - MCP server tools

Each handler accepts model configuration and error handling options.

## Features

- Chat container + message rendering primitives
- **Model selection** dropdown with store management
- **Chain of thought** reasoning display mode
- Slash command system with parameter schema (zod)
- Frontend tool registration (execute functions client side)
- Context sharing hooks (inject dynamic UI state as model context)
- Focus/selection tracking for contextual relevance
- AI suggestion queue + UI components
- Reasoning / tool / sources / code block message parts
- Tailwind + shadcn/ui base components

## CSS / Theming

- `ai-chat-bootstrap/tokens.css` exposes design tokens + minimal global fixes
- `ai-chat-bootstrap/ai-chat.css` ships the component styles without Tailwind preflight
- The Tailwind preset maps the tokens to theme values if you opt into full Tailwind compilation
- Override theme by redefining CSS custom properties after importing the tokens

### Layered Tokens

For more granular control, you can import individual CSS files if needed (check the `lib/` directory for available styles).

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
  <ChatContainer
    transport={{ api: "/api/chat" }}
    messages={{ systemPrompt: "You are a helpful AI assistant." }}
  />
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
  <ChatContainer
    transport={{ api: "/api/chat" }}
    messages={{ systemPrompt: "You are a helpful AI assistant." }}
  />
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

## Component Props

### ChatContainer

**Chat Configuration (AI Settings):**

- `transport`: `{ api?: string }` – endpoint for AI requests
- `messages`: `{ systemPrompt?: string; initial?: UIMessage[] }`
- `threads`: `{ enabled?: boolean; id?: string; scopeKey?: string; autoCreate?: boolean; warnOnMissing?: boolean; title?: { enabled?: boolean; api?: string; sampleCount?: number } }`
- `features`: `{ chainOfThought?: boolean }`
- `mcp`: `{ enabled?: boolean; api?: string; servers?: SerializedMCPServer[] }`
- `models`: `{ available?: ChatModelOption[]; initial?: string }`

**Optional:**

- `header`: title, subtitle, avatar, badge, actions, className
- `ui`: placeholder, className, classes (`header`, `messages`, `message`, `input`, `assistantActions`), emptyState
- `suggestions`: enabled, prompt, count
- `commands`: enabled
- `assistantActions`: enable built-in buttons (`copy`, `regenerate`, `debug`, `feedback`) or supply a `custom` array of `AssistantAction`s for bespoke controls

### ChatPopout

Extends `ChatContainer` props with:

- `popout`: position, mode, container, width, height, className
- `button`: show, label, icon, className, container

Both components handle the AI chat state internally - no manual state management needed.

Enable suggestions and commands:

```tsx
<ChatContainer
  transport={{ api: "/api/chat" }}
  messages={{ systemPrompt: "You are a helpful AI assistant." }}
  suggestions={{ enabled: true, count: 3 }}
  commands={{ enabled: true }}
  threads={{ enabled: true }}
/>
```

Model selection and chain of thought:

```tsx
<ChatContainer
  transport={{ api: "/api/chat" }}
  messages={{ systemPrompt: "You are a helpful AI assistant." }}
  models={{
    available: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
    ],
    initial: "gpt-4o",
  }}
  features={{ chainOfThought: true }}
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
