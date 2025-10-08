## AI Chat Bootstrap

Scaffolded with `ai-chat-bootstrap` CLI.

### Includes

- API routes: `/api/chat`, `/api/suggestions`, `/api/thread-title`, `/api/mcp`, `/api/compression`
- Floating chat popout on the home page with threads & auto titles enabled
- Compression pipeline wired to `/api/compression` with model metadata ready for budget tracking
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

### Theme Tokens

The scaffold injected our claymorphism light/dark palette (still shadcn-compatible) into `app/globals.css`. Keep that block (it must live outside `@layer base`) and tweak the variable values to match your brand. The chat components read those tokens directly—if you delete them, the UI loses its color system.

Tip: once your Tailwind build emits the chat utilities, you can remove the `@import "ai-chat-bootstrap/ai-chat.css";` line from `globals.css` to avoid duplicate CSS.

### Next Ideas

- Persist messages to a database
- Add authentication / per-user sessions
- Theme by overriding CSS custom properties after importing `tokens.css`
- Add domain specific tools & commands

Enjoy building ✨
