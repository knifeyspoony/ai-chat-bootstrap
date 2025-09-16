import { createMcpToolsHandler } from "ai-chat-bootstrap/server";

export const POST = createMcpToolsHandler({
  onError: (error: unknown) => {
    console.error("[mcp-api] failed to load tools", error);
  },
});
