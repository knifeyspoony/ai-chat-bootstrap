import { createMcpToolsHandler } from "ai-chat-bootstrap/server";

/**
 * MCP tools bridge for loading Remote Model Context Protocol servers.
 * Extend error handling or auth as needed for your environment.
 */
const handler = createMcpToolsHandler({
  onError: (error) => {
    console.error("[mcp-api]", error);
  },
});

export { handler as POST };
