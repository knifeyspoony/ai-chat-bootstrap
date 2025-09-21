## AI Chat Bootstrap

Scaffolded with `ai-chat-bootstrap` CLI.

### Includes

- API routes: `/api/chat`, `/api/suggestions`, `/api/thread-title`, `/api/mcp`
- Floating chat popout on the home page with threads & auto titles enabled
- Suggestions, slash commands, and MCP tooling ready (configure via `ChatContainer` props)
- Hooks for context (`useAIContext`), tools (`useAIFrontendTool`), commands (`useAIChatCommand`)

### Run

```
npm run dev
```

Visit http://localhost:3000/

### Add a frontend tool

```tsx
import { useAIFrontendTool } from "ai-chat-bootstrap";
import { z } from "zod";

useAIFrontendTool({
  name: "increment",
  description: "Increment a counter",
  parameters: z.object({ amount: z.number().default(1) }),
  execute: async ({ amount }) => ({ newValue: amount }),
});
```

### Theme Toggle

Dark mode tokens are already defined. A small client-side toggle writes `data-theme="dark"` to `<html>` and persists preference in `localStorage`.

To customize, override variables after importing `tokens.css`, e.g.:

```css
:root[data-theme="dark"] {
  --primary: oklch(0.85 0 0);
}
```

### Next Ideas

- Persist messages to a database
- Add authentication / per-user sessions
- Theme by overriding CSS custom properties after importing `tokens.css`
- Add domain specific tools & commands

Enjoy building ✨
