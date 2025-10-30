"use client";

import { ChatContainer } from "ai-chat-bootstrap";

const DEMO_MODELS = [
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4.1", label: "GPT-4.1" },
];

const DEFAULT_MCP_SERVER_URL =
  process.env.NEXT_PUBLIC_MCP_SERVER_URL ?? "http://127.0.0.1:3031/mcp";

export default function McpTestPage() {
  return (
    <div className="h-screen flex flex-col">
      <div className="border-b bg-background p-4">
        <h1 className="text-2xl font-bold">MCP Server Registration Test</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Testing automatic tool discovery via ChatContainer mcp prop
        </p>
      </div>

      <div className="flex-1">
        <ChatContainer
          transport={{ api: "/api/chat" }}
          messages={{
            systemPrompt:
              "You are a helpful assistant. You have access to MCP tools that were automatically discovered.",
          }}
          models={{ available: DEMO_MODELS, initial: DEMO_MODELS[0].id }}
          mcp={{
            enabled: true,
            api: "/api/mcp-discovery",
            servers: [
              {
                id: "demo-mcp-server",
                name: "Demo MCP Toolkit",
                transport: {
                  type: "streamable-http",
                  url: DEFAULT_MCP_SERVER_URL,
                },
              },
            ],
          }}
          header={{
            title: "MCP Test Chat",
            subtitle: "Tools auto-fetched from mcp.servers prop",
          }}
          ui={{
            placeholder:
              "Ask me about available tools or try using the MCP tools...",
          }}
        />
      </div>
    </div>
  );
}
