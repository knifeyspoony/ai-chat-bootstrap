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
          Testing automatic tool discovery via ChatContainer mcp prop with custom tool renderers
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
            toolRenderers: [
              {
                serverUrl: DEFAULT_MCP_SERVER_URL,
                toolName: "demo_weather_forecast",
                render: (result: unknown): React.ReactNode => {
                  // MCP tools return {content: [{type: "text", text: "..."}]}
                  // Parse the JSON from the text content
                  let data: Record<string, unknown> = {};
                  try {
                    const mcpResult = result as { content?: Array<{ type: string; text: string }> };
                    if (mcpResult.content?.[0]?.text) {
                      data = JSON.parse(mcpResult.content[0].text);
                    }
                  } catch (error) {
                    console.error("[weather-renderer] Failed to parse MCP result:", error);
                    data = result as Record<string, unknown>;
                  }

                  if (data.error) {
                    return (
                      <div className="space-y-2 text-destructive">
                        <p className="text-sm">{String(data.error)}</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                          {String(data.location || "Weather")}
                        </h3>
                        <span className="text-3xl font-bold">
                          {String(data.temperature || "")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">
                        {String(data.conditions || data.condition || "N/A")}
                      </p>
                      {data.humidity ? (
                        <div className="text-xs text-muted-foreground">
                          Humidity: {String(data.humidity)}%
                        </div>
                      ) : null}
                    </div>
                  );
                },
              },
              {
                serverUrl: DEFAULT_MCP_SERVER_URL,
                toolName: "demo_meeting_agenda",
                render: (result: unknown): React.ReactNode => {
                  // MCP tools return {content: [{type: "text", text: "..."}]}
                  // Parse the JSON from the text content
                  let data: Record<string, unknown> = {};
                  try {
                    const mcpResult = result as { content?: Array<{ type: string; text: string }> };
                    if (mcpResult.content?.[0]?.text) {
                      data = JSON.parse(mcpResult.content[0].text);
                    }
                  } catch (error) {
                    console.error("[meeting-renderer] Failed to parse MCP result:", error);
                    data = result as Record<string, unknown>;
                  }

                  return (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                        Meeting Agenda: {String(data.topic || "Unknown")} ({Number(data.durationMinutes || 0)} min)
                      </h3>
                      {Array.isArray(data.results) ? (
                        <ul className="space-y-2">
                          {data.results.map((item: Record<string, unknown>, idx: number) => (
                            <li
                              key={idx}
                              className="border-l-2 border-primary/50 pl-3"
                            >
                              <div className="font-medium">
                                {String(item.title || item.name || "")}
                              </div>
                              {item.description ? (
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {String(item.description)}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm">{JSON.stringify(data)}</div>
                      )}
                    </div>
                  );
                },
              },
            ],
          }}
          header={{
            title: "MCP Test Chat",
            subtitle: "Tools auto-fetched from mcp.servers prop with custom renderers",
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
