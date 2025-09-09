"use client";
import {
  ChatContainer,
  useAIFrontendTool,
  type UIMessage,
} from "ai-chat-bootstrap";
import React, { useState } from "react";
import { z } from "zod";

// Demo component that uses frontend tools (for the live demo)
export function ChatWithToolsExample() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: input }],
    };
    setMessages((m) => [...m, userMessage]);
    const userInput = input;
    setInput("");
    setIsLoading(true);

    // Simulate AI tool usage for demo
    setTimeout(() => {
      const responseText = `You said: "${userInput}".`;

      // Check if user is asking about counter operations
      if (
        userInput.toLowerCase().includes("increment") ||
        userInput.toLowerCase().includes("increase")
      ) {
        // Simulate tool call
        const amount = parseInt(userInput.match(/\d+/)?.[0] || "1");
        const newValue = counter + amount;
        setCounter(newValue);

        const toolMessage: UIMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [
            {
              type: "tool-increment_counter" as const,
              toolCallId: crypto.randomUUID(),
              state: "output-available" as const,
              input: { amount },
              output: {
                newValue,
                amount,
                message: `Counter incremented by ${amount}. New value: ${newValue}`,
              },
            },
            {
              type: "text",
              text: `I've incremented the counter by ${amount}! The new value is ${newValue}.`,
            },
          ],
        };
        setMessages((m) => [...m, toolMessage]);
      } else if (
        userInput.toLowerCase().includes("decrement") ||
        userInput.toLowerCase().includes("decrease")
      ) {
        // Simulate tool call
        const amount = parseInt(userInput.match(/\d+/)?.[0] || "1");
        const newValue = counter - amount;
        setCounter(newValue);

        const toolMessage: UIMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [
            {
              type: "tool-decrement_counter" as const,
              toolCallId: crypto.randomUUID(),
              state: "output-available" as const,
              input: { amount },
              output: {
                newValue,
                amount,
                message: `Counter decremented by ${amount}. New value: ${newValue}`,
              },
            },
            {
              type: "text",
              text: `I've decremented the counter by ${amount}! The new value is ${newValue}.`,
            },
          ],
        };
        setMessages((m) => [...m, toolMessage]);
      } else {
        const assistantMessage: UIMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [
            {
              type: "text",
              text: `${responseText} I can help you control the counter above! Try saying "increment by 5" or "decrease by 2".`,
            },
          ],
        };
        setMessages((m) => [...m, assistantMessage]);
      }
      setIsLoading(false);
    }, 800);
  }

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
      <div className="h-[420px] w-full">
        <ChatContainer
          header={{
            title: "AI Assistant with Tools",
            subtitle: "Can control the counter above",
          }}
          ui={{ placeholder: "Try: 'increment by 3' or 'decrease by 2'" }}
          state={{ messages, isLoading }}
          inputProps={{
            value: input,
            onChange: setInput,
            onSubmit: handleSubmit,
          }}
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
    api: "/api/chat",
    systemPrompt: "You are a helpful assistant that can control a counter widget. Use the increment_counter and decrement_counter tools when users ask you to change the counter value."
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
      <div className="h-[420px] w-full">
        <ChatContainer
          header={{ title: "AI Assistant with Tools", subtitle: "Can control the counter above" }}
          ui={{ placeholder: "Try: 'increment by 3' or 'decrease by 2'" }}
          chat={chat}
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
