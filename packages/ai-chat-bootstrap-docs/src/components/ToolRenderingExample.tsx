"use client";
import {
  MockChatContainer,
  useAIFrontendTool,
  type UIMessage,
} from "ai-chat-bootstrap";
import { z } from "zod";
import { useMockAIChat } from "./shared/useMockAIChat";

// Custom Chart Component
function ChartComponent({
  data,
  type,
  title,
}: {
  data: Array<{ label: string; value: number }>;
  type: "bar" | "pie" | "line";
  title: string;
}) {
  const maxValue = Math.max(...data.map((d) => d.value));

  if (type === "bar") {
    return (
      <div className="p-4 bg-card rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-16 text-sm text-muted-foreground truncate">
                {item.label}
              </div>
              <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "pie") {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const colors = [
      "hsl(var(--primary))",
      "hsl(var(--secondary))",
      "hsl(var(--accent))",
      "hsl(var(--muted-foreground))",
    ];

    return (
      <div className="p-4 bg-card rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="flex items-center gap-6">
          <div className="relative w-32 h-32">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 100 100"
            >
              {data.map((item, index) => {
                const percentage = (item.value / total) * 100;
                const offset = data
                  .slice(0, index)
                  .reduce((sum, prev) => sum + (prev.value / total) * 100, 0);
                return (
                  <circle
                    key={index}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={colors[index % colors.length]}
                    strokeWidth="20"
                    strokeDasharray={`${percentage * 2.51327} ${
                      251.327 - percentage * 2.51327
                    }`}
                    strokeDashoffset={-offset * 2.51327}
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>
          </div>
          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="text-sm">
                  {item.label}: {item.value} (
                  {Math.round((item.value / total) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-card rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="text-center text-muted-foreground">
        Line charts coming soon!
      </div>
    </div>
  );
}

// Progress Bar Component
function ProgressBar({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="p-3 bg-card rounded-lg border">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">{progress}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

// Demo component with custom rendering tools
export function ToolRenderingExample() {
  const mockChat = useMockAIChat();

  // Chart creation tool with custom rendering
  useAIFrontendTool({
    name: "create_chart",
    description: "Create a data visualization chart (bar or pie chart)",
    parameters: z.object({
      title: z.string().describe("Title for the chart"),
      type: z.enum(["bar", "pie", "line"]).describe("Type of chart to create"),
      data: z
        .array(
          z.object({
            label: z.string().describe("Label for data point"),
            value: z.number().describe("Value for data point"),
          })
        )
        .describe("Data points for the chart"),
    }),
    execute: async (params) => {
      return {
        chartId: `chart-${Date.now()}`,
        title: params.title,
        type: params.type,
        data: params.data,
        createdAt: new Date().toISOString(),
      };
    },
    render: (result) => (
      <ChartComponent
        title={result.title}
        type={result.type}
        data={result.data}
      />
    ),
  });

  // Progress tracking tool with custom rendering
  useAIFrontendTool({
    name: "show_progress",
    description: "Display a progress bar with a label and percentage",
    parameters: z.object({
      label: z.string().describe("Label for the progress bar"),
      progress: z
        .number()
        .min(0)
        .max(100)
        .describe("Progress percentage (0-100)"),
    }),
    execute: async (params) => {
      return {
        id: `progress-${Date.now()}`,
        label: params.label,
        progress: params.progress,
        timestamp: new Date().toISOString(),
      };
    },
    render: (result) => (
      <ProgressBar label={result.label} progress={result.progress} />
    ),
  });

  // Override the sendMessageWithContext to add our custom logic
  const sendMessageWithContext = (text: string) => {
    if (!text.trim()) return;
    const userMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text }],
    };
    mockChat.setMessages((m: UIMessage[]) => [...m, userMessage]);
    mockChat.setIsLoading(true);

    // Simulate AI tool usage for demo
    setTimeout(() => {
      const responseText = `You said: "${text}".`;

      // Check if user is asking for a chart
      if (
        text.toLowerCase().includes("chart") ||
        text.toLowerCase().includes("graph")
      ) {
        const sampleData = [
          { label: "React", value: 45 },
          { label: "Vue", value: 25 },
          { label: "Angular", value: 20 },
          { label: "Svelte", value: 10 },
        ];

        const chartType = text.toLowerCase().includes("pie") ? "pie" : "bar";

        const toolMessage: UIMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [
            {
              type: "tool-create_chart" as const,
              toolCallId: crypto.randomUUID(),
              state: "output-available" as const,
              input: {
                title: "Framework Popularity",
                type: chartType,
                data: sampleData,
              },
              output: {
                chartId: `chart-${Date.now()}`,
                title: "Framework Popularity",
                type: chartType,
                data: sampleData,
                createdAt: new Date().toISOString(),
              },
            },
            {
              type: "text",
              text: `I've created a ${chartType} chart showing framework popularity. The chart displays data for React, Vue, Angular, and Svelte.`,
            },
          ],
        };
        mockChat.setMessages((m: UIMessage[]) => [...m, toolMessage]);
      } else if (text.toLowerCase().includes("progress")) {
        const progress = Math.floor(Math.random() * 100) + 1;

        const toolMessage: UIMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [
            {
              type: "tool-show_progress" as const,
              toolCallId: crypto.randomUUID(),
              state: "output-available" as const,
              input: {
                label: "Project Completion",
                progress: progress,
              },
              output: {
                id: `progress-${Date.now()}`,
                label: "Project Completion",
                progress: progress,
                timestamp: new Date().toISOString(),
              },
            },
            {
              type: "text",
              text: `Here's your project progress! You're ${progress}% complete. Keep up the great work!`,
            },
          ],
        };
        mockChat.setMessages((m: UIMessage[]) => [...m, toolMessage]);
      } else {
        const assistantMessage: UIMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [
            {
              type: "text",
              text: `${responseText} I can create visualizations for you! Try asking for a "bar chart", "pie chart", or "show progress".`,
            },
          ],
        };
        mockChat.setMessages((m: UIMessage[]) => [...m, assistantMessage]);
      }
      mockChat.setIsLoading(false);
    }, 1000);
  };

  const chat = {
    ...mockChat,
    sendMessageWithContext,
  };

  return (
    <div className="h-[500px] w-full">
      <MockChatContainer
        chat={chat}
        header={{
          title: "AI with Custom Tool Rendering",
          subtitle: "Tools that render React components",
        }}
        ui={{ placeholder: "Try: 'create a bar chart' or 'show progress'" }}
      />
    </div>
  );
}

// Source code for the frontend implementation
export const TOOL_RENDERING_SOURCE = `"use client";
import React, { useState } from "react";
import { ChatContainer, useAIFrontendTool } from "ai-chat-bootstrap";
import { z } from "zod";

// Custom Chart Component
function ChartComponent({ data, type, title }: { 
  data: Array<{ label: string; value: number }>; 
  type: "bar" | "pie" | "line";
  title: string;
}) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="p-4 bg-card rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-16 text-sm text-muted-foreground">
              {item.label}
            </div>
            <div className="flex-1 bg-muted rounded-full h-6 relative">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: \`\${(item.value / maxValue) * 100}%\` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ToolRenderingDemo() {
  // Chart creation tool with custom rendering
  useAIFrontendTool({
    name: "create_chart",
    description: "Create a data visualization chart",
    parameters: z.object({
      title: z.string().describe("Title for the chart"),
      type: z.enum(["bar", "pie", "line"]).describe("Type of chart"),
      data: z.array(z.object({
        label: z.string().describe("Label for data point"),
        value: z.number().describe("Value for data point"),
      })).describe("Data points for the chart"),
    }),
    execute: async (params) => {
      return {
        chartId: \`chart-\${Date.now()}\`,
        title: params.title,
        type: params.type,
        data: params.data,
        createdAt: new Date().toISOString(),
      };
    },
    render: (result) => (
      <ChartComponent
        title={result.title}
        type={result.type}
        data={result.data}
      />
    ),
  });


  return (
    <ChatContainer
      transport={{ api: "/api/chat" }}
      messages={{
        systemPrompt:
          "You can create charts using the create_chart tool when users request data visualizations.",
      }}
      header={{ title: "AI with Custom Rendering" }}
      ui={{ placeholder: "Ask me to create a chart!" }}
    />
  );
}`;

// Source code for the backend API route
export const TOOL_RENDERING_API_SOURCE = `import { openai } from "@ai-sdk/openai";
import { streamText, convertToCoreMessages } from "ai";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { messages, systemPrompt, tools, context, focus } = await req.json();

  const result = streamText({
    model: openai("gpt-4"),
    system: systemPrompt || "You are a helpful AI assistant that can create data visualizations.",
    messages: convertToCoreMessages(messages),
    tools, // Tools with render methods are automatically passed
    toolChoice: "auto",
  });

  return result.toUIMessageStreamResponse();
}`;
