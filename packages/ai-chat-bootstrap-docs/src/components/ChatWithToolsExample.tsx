"use client";
import { MockChatContainer, useAIFrontendTool } from "ai-chat-bootstrap";
import React, { useState } from "react";
import { z } from "zod";
import { useMockAIChat } from "./shared/useMockAIChat";

export function ChatWithToolsExample() {
  const [counter, setCounter] = useState(0);

  // Register the counter increment tool
  useAIFrontendTool({
    name: "increment_counter",
    description: "Increment the counter by a specified amount",
    parameters: z.object({
      amount: z.number().default(1).describe("Amount to increment by"),
    }),
    execute: async (params: { amount: number }) => {
      const newValue = counter + params.amount;
      setCounter(newValue);
      return {
        newValue,
        amount: params.amount,
        message: `Counter incremented by ${params.amount}. New value: ${newValue}`,
      };
    },
  });

  // Register the counter decrement tool
  useAIFrontendTool({
    name: "decrement_counter",
    description: "Decrement the counter by a specified amount",
    parameters: z.object({
      amount: z.number().default(1).describe("Amount to decrement by"),
    }),
    execute: async (params: { amount: number }) => {
      const newValue = counter - params.amount;
      setCounter(newValue);
      return {
        newValue,
        amount: params.amount,
        message: `Counter decremented by ${params.amount}. New value: ${newValue}`,
      };
    },
  });

  // Helper function to extract numbers from text
  function extractNumber(text: string): number | null {
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  // Create custom response generator with tool simulation
  const toolAwareResponseGenerator = React.useCallback(
    (text: string) => {
      const lowerInput = text.toLowerCase();
      const responseText = `You said: "${text}".`;

      if (
        lowerInput.includes("increment") ||
        lowerInput.includes("increase") ||
        lowerInput.includes("add") ||
        lowerInput.includes("up")
      ) {
        const amount = extractNumber(text) || 1;
        const newValue = counter + amount;
        setCounter(newValue);
        return `I'll increment the counter by ${amount}. Counter incremented by ${amount}. New value: ${newValue}`;
      } else if (
        lowerInput.includes("decrement") ||
        lowerInput.includes("decrease") ||
        lowerInput.includes("subtract") ||
        lowerInput.includes("reduce")
      ) {
        const amount = extractNumber(text) || 1;
        const newValue = counter - amount;
        setCounter(newValue);
        return `I'll decrement the counter by ${amount}. Counter decremented by ${amount}. New value: ${newValue}`;
      } else {
        return `${responseText} I can help you control the counter above! Try saying "increment by 5" or "decrease by 2".`;
      }
    },
    [counter]
  );

  // Create mock chat with tool-aware responses
  const mockChat = useMockAIChat({
    responseGenerator: toolAwareResponseGenerator,
    responseDelay: 800,
  });

  return (
    <div className="space-y-4">
      {/* Counter Display */}
      <div className="flex items-center justify-center p-6 border rounded-lg bg-muted/50">
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">{counter}</div>
          <div className="text-sm text-muted-foreground">Counter Value</div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="h-[600px] w-full">
        <MockChatContainer
          chat={mockChat}
          header={{
            title: "AI Assistant with Tools",
            subtitle: "Can control the counter above",
          }}
          ui={{ placeholder: "Try: 'increment by 3' or 'decrease by 2'" }}
        />
      </div>
    </div>
  );
}

// Source code for the frontend implementation
export const TOOLS_CHAT_SOURCE = `"use client";
import React, { useState } from "react";
import { ChatContainer, useAIChat, useAIFrontendTool } from "ai-chat-bootstrap";
import { z } from "zod";

export function ChatWithTools() {
  const [counter, setCounter] = useState(0);
  
  // Register frontend tools that AI can use
  useAIFrontendTool({
    name: "increment_counter",
    description: "Increment the counter by a specified amount",
    parameters: z.object({
      amount: z.number().default(1).describe("Amount to increment by"),
    }),
    execute: async (params: { amount: number }) => {
      const newValue = counter + params.amount;
      setCounter(newValue);
      return { 
        newValue, 
        amount: params.amount,
        message: \`Counter incremented by \${params.amount}. New value: \${newValue}\`
      };
    },
  });

  useAIFrontendTool({
    name: "decrement_counter", 
    description: "Decrement the counter by a specified amount",
    parameters: z.object({
      amount: z.number().default(1).describe("Amount to decrement by"),
    }),
    execute: async (params: { amount: number }) => {
      const newValue = counter - params.amount;
      setCounter(newValue);
      return { 
        newValue, 
        amount: params.amount,
        message: \`Counter decremented by \${params.amount}. New value: \${newValue}\`
      };
    },
  });

  const chat = useAIChat({
    transport: { api: "/api/chat" },
    messages: {
      systemPrompt:
        "You are a helpful assistant that can control a counter widget. Use the increment_counter and decrement_counter tools when users ask you to change the counter value.",
    },
  });

  return (
    <div className="space-y-4">
      {/* Counter Display */}
      <div className="flex items-center justify-center p-6 border rounded-lg bg-muted/50">
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">{counter}</div>
          <div className="text-sm text-muted-foreground">Counter Value</div>
        </div>
      </div>
      
      {/* Chat Interface */}
      <div className="h-[600px] w-full">
        <ChatContainer
          transport={{ api: "/api/chat" }}
          messages={{
            systemPrompt:
              "You are a helpful assistant that can control a counter widget. Use the increment_counter and decrement_counter tools when users ask you to change the counter value.",
          }}
          header={{ title: "AI Assistant with Tools", subtitle: "Can control the counter above" }}
          ui={{ placeholder: "Try: 'increment by 3' or 'decrease by 2'" }}
        />
      </div>
    </div>
  );
}`;

// Source code for the backend API route
export const TOOLS_API_SOURCE = `import { openai } from "@ai-sdk/openai";
import { streamText, convertToCoreMessages } from "ai";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { messages, systemPrompt, tools, context, focus } = await req.json();

  const result = streamText({
    model: openai("gpt-4"),
    system: systemPrompt || "You are a helpful AI assistant.",
    messages: convertToCoreMessages(messages),
    tools, // Frontend tools are automatically passed here
    toolChoice: "auto", // Let the AI decide when to use tools
  });

  return result.toUIMessageStreamResponse();
}`;
