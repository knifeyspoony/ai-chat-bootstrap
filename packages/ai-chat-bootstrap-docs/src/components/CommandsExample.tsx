"use client";
import {
  ChatContainer,
  useAIChatCommand,
  useAIFrontendTool,
  useUIChatCommand,
  type UIMessage,
} from "ai-chat-bootstrap";
import { useState } from "react";
import { z } from "zod";
import { useMockAIChat } from "./shared/useMockAIChat";

// Demo component that demonstrates both AI and UI commands
export function CommandsExample() {
  const mockChat = useMockAIChat();
  const [theme, setTheme] = useState("light");
  const [debugMode, setDebugMode] = useState(false);
  const [counter, setCounter] = useState(0);

  // Register frontend tool for AI commands
  useAIFrontendTool({
    name: "content_analyzer",
    description: "Analyze text content",
    parameters: z.object({
      text: z.string(),
      type: z.enum(["sentiment", "keywords", "summary"]),
    }),
    execute: async (params: { text: string; type: string }) => {
      // Simulate analysis with mock data
      const analyses = {
        sentiment: {
          score: 0.8,
          label: "positive",
          confidence: 0.9,
          details:
            "The text expresses positive sentiment with optimistic language.",
        },
        keywords: {
          keywords: ["example", "content", "analysis", "positive", "demo"],
          relevance: [0.9, 0.8, 0.7, 0.6, 0.5],
          categories: ["technical", "educational"],
        },
        summary: {
          summary:
            "This is a demonstration of content analysis capabilities showing how AI can process and understand text.",
          wordCount: params.text.split(" ").length,
          mainTopics: ["demonstration", "analysis", "AI"],
        },
      };

      return {
        success: true,
        analysis: analyses[params.type as keyof typeof analyses],
        type: params.type,
        inputLength: params.text.length,
        timestamp: new Date().toISOString(),
      };
    },
  });

  useAIFrontendTool({
    name: "counter_tool",
    description: "Manage a counter value",
    parameters: z.object({
      action: z.enum(["increment", "decrement", "reset"]),
      amount: z.number().default(1),
    }),
    execute: async (params: { action: string; amount: number }) => {
      let newValue = counter;
      let message = "";

      switch (params.action) {
        case "increment":
          newValue = counter + params.amount;
          message = `Counter incremented by ${params.amount}`;
          break;
        case "decrement":
          newValue = counter - params.amount;
          message = `Counter decremented by ${params.amount}`;
          break;
        case "reset":
          newValue = 0;
          message = "Counter reset to 0";
          break;
      }

      setCounter(newValue);

      return {
        success: true,
        action: params.action,
        amount: params.amount,
        oldValue: counter,
        newValue,
        message,
      };
    },
  });

  // AI Commands
  useAIChatCommand({
    name: "analyze",
    description: "Analyze text content using AI",
    toolName: "content_analyzer",
    parameters: z.object({
      text: z.string().describe("Text to analyze"),
      type: z
        .enum(["sentiment", "keywords", "summary"])
        .default("summary")
        .describe("Type of analysis"),
    }),
    systemPrompt: `You are an expert content analyst. When analyzing content:
    - For sentiment: Explain the emotional tone and provide insights
    - For keywords: Identify key themes and important terms  
    - For summary: Create a concise, informative summary
    Always be thorough and provide actionable insights.`,
  });

  useAIChatCommand({
    name: "count",
    description: "Manage a counter using AI",
    toolName: "counter_tool",
    parameters: z.object({
      action: z
        .enum(["increment", "decrement", "reset"])
        .describe("Action to perform"),
      amount: z.number().default(1).describe("Amount to change by"),
    }),
    systemPrompt:
      "You are helping manage a counter. Explain what you're doing and provide the results clearly.",
  });

  // UI Commands
  useUIChatCommand({
    name: "theme",
    description: "Change the application theme",
    parameters: z.object({
      mode: z.enum(["light", "dark", "auto"]).describe("Theme mode"),
    }),
    execute: async ({ mode }: { mode: string }) => {
      setTheme(mode);
      // In a real app, you'd update the actual theme
      console.log(`Theme changed to ${mode}`);
    },
  });

  useUIChatCommand({
    name: "clear",
    description: "Clear the chat history",
    parameters: z.object({}),
    execute: async () => {
      mockChat.setMessages([]);
      console.log("Chat cleared");
    },
  });

  useUIChatCommand({
    name: "debug",
    description: "Toggle debug mode",
    parameters: z.object({
      enabled: z.boolean().optional().describe("Enable or disable debug mode"),
    }),
    execute: async ({ enabled }: { enabled?: boolean }) => {
      const newState = enabled !== undefined ? enabled : !debugMode;
      setDebugMode(newState);
      console.log(`Debug mode: ${newState ? "ON" : "OFF"}`);
    },
  });

  useUIChatCommand({
    name: "reset",
    description: "Reset all demo state",
    parameters: z.object({}),
    execute: async () => {
      mockChat.setMessages([]);
      setTheme("light");
      setDebugMode(false);
      setCounter(0);
      console.log("Demo state reset");
    },
  });

  // Override the sendMessageWithContext to add our custom logic
  const sendMessageWithContext = (text: string) => {
    if (!text.trim()) return;
    const userMessage: UIMessage = {
      id: Date.now().toString(),
      role: "user",
      parts: [{ type: "text", text }],
    };
    mockChat.setMessages((prev) => [...prev, userMessage]);
    mockChat.setIsLoading(true);

    // Simulate AI response for demo
    setTimeout(() => {
      const aiMessage: UIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        parts: [
          {
            type: "text",
            text: `This is a demo response. In a real app, the AI would process your message: "${text}". Try using commands like /analyze, /theme, /clear, or /debug!`,
          },
        ],
      };
      mockChat.setMessages((prev) => [...prev, aiMessage]);
      mockChat.setIsLoading(false);
    }, 1000);
  };

  const chat = {
    ...mockChat,
    sendMessageWithContext,
  };

  return (
    <div className="space-y-4">
      {/* Counter Display */}
      <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/50">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary mb-1">{counter}</div>
          <div className="text-xs text-muted-foreground">Counter Value</div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="h-[400px] w-full">
        <ChatContainer
          chat={chat}
          header={{
            title: "Commands Demo",
            subtitle: `Theme: ${theme} | Debug: ${debugMode ? "ON" : "OFF"}`,
          }}
          ui={{
            placeholder:
              "Try: /analyze text:hello, /theme mode:dark, /clear, /debug",
          }}
          commands={{
            enabled: true,
          }}
        />
      </div>

      {/* Debug Info */}
      {debugMode && (
        <div className="p-3 bg-muted rounded-lg">
          <h4 className="font-bold text-sm mb-2">Debug Info</h4>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(
              {
                messageCount: mockChat.messages.length,
                theme,
                debugMode,
                counter,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}

// Source code for the chat component with commands
export const COMMANDS_CHAT_SOURCE = `"use client";
import React, { useState } from "react";
import { 
  ChatContainer, 
  useAIChat, 
  useAIChatCommand,
  useUIChatCommand,
  useAIFrontendTool 
} from "ai-chat-bootstrap";
import { z } from "zod";

export function ChatWithCommands() {
  const [messages, setMessages] = useState([]);
  const [theme, setTheme] = useState("light");
  const [debugMode, setDebugMode] = useState(false);

  // Frontend tool for AI commands
  useAIFrontendTool({
    name: "content_analyzer",
    description: "Analyze text content",
    parameters: z.object({
      text: z.string(),
      type: z.enum(["sentiment", "keywords", "summary"]),
    }),
    execute: async (params) => {
      // Analysis logic here
      return {
        success: true,
        analysis: analyzeContent(params.text, params.type),
        type: params.type,
      };
    },
  });

  // AI Command - processed by LLM
  useAIChatCommand({
    name: "analyze",
    description: "Analyze text content using AI",
    toolName: "content_analyzer",
    parameters: z.object({
      text: z.string().describe("Text to analyze"),
      type: z.enum(["sentiment", "keywords", "summary"])
        .default("summary")
        .describe("Type of analysis"),
    }),
    systemPrompt: "You are an expert content analyst. Provide thorough analysis and actionable insights."
  });

  // UI Commands - execute directly
  useUIChatCommand({
    name: "theme",
    description: "Change the application theme",
    parameters: z.object({
      mode: z.enum(["light", "dark", "auto"]).describe("Theme mode"),
    }),
    execute: async ({ mode }) => {
      setTheme(mode);
      document.documentElement.setAttribute("data-theme", mode);
    }
  });

  useUIChatCommand({
    name: "clear",
    description: "Clear the chat history",
    parameters: z.object({}),
    execute: async () => {
      setMessages([]);
    }
  });

  useUIChatCommand({
    name: "debug",
    description: "Toggle debug mode",
    parameters: z.object({
      enabled: z.boolean().optional().describe("Enable or disable debug"),
    }),
    execute: async ({ enabled }) => {
      const newState = enabled !== undefined ? enabled : !debugMode;
      setDebugMode(newState);
    }
  });

  const chat = useAIChat({
    api: "/api/chat",
    messages,
    onMessagesChange: setMessages,
  });

  return (
    <div className="space-y-4">
      <div className="h-[500px] w-full">
        <ChatContainer
          header={{ title: "Chat with Commands", subtitle: "Try AI: /analyze or UI: /theme, /clear, /debug" }}
          ui={{ placeholder: "Type / to see available commands" }}
          chat={chat}
        />
      </div>
      
      {debugMode && (
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-bold mb-2">Debug Info</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify({
              messageCount: messages.length,
              theme,
              debugMode,
              timestamp: new Date().toISOString(),
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}`;

// Source code for the backend API route
export const COMMANDS_API_SOURCE = `import { openai } from "@ai-sdk/openai";
import { streamText, convertToCoreMessages } from "ai";

export async function POST(req: NextRequest) {
  const { messages, systemPrompt, tools } = await req.json();

  const result = streamText({
    model: openai("gpt-4"),
    system: systemPrompt || "You are a helpful assistant with access to various tools and commands.",
    messages: convertToCoreMessages(messages),
    tools, // Frontend tools are automatically included
    toolChoice: "auto",
  });

  return result.toUIMessageStreamResponse();
}`;
