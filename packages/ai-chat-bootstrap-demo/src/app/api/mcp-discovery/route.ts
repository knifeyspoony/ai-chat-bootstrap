import { createMcpToolsHandler } from "ai-chat-bootstrap/server";

export const POST = createMcpToolsHandler({
  onError: (error: unknown) => {
    console.error("[mcp-discovery-api] failed to load tools", error);
  },
});
