"use client";
import { ChatContainer, type UIMessage } from "ai-chat-bootstrap";
import React, { useState } from "react";

// A super lightweight mock chat producing a canned assistant reply.
export function BasicChatExample() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    // Simulate a network/AI delay
    setTimeout(() => {
      const assistantMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [
          {
            type: "text",
            text: `You said: "${userInput}". This is a mock response from the AI model.`,
          },
        ],
      };
      setMessages((m) => [...m, assistantMessage]);
      setIsLoading(false);
    }, 600);
  }

  return (
    <div className="h-[420px] w-full">
      <ChatContainer
        title="AI Assistant"
        subtitle="Connected to AI"
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        placeholder="Ask me anything..."
      />
    </div>
  );
}

export const BASIC_CHAT_SOURCE = `"use client";
import React from "react";
import { ChatContainer, useAIChat } from "ai-chat-bootstrap";

export function BasicChat() {
  const chat = useAIChat({
    api: "/api/chat",
    systemPrompt: "You are a helpful AI assistant."
  });

  return (
    <div className="h-[420px] w-full">
      <ChatContainer
        title="AI Assistant"
        subtitle="Connected to AI"
        messages={chat.messages}
        input={chat.input}
        onInputChange={chat.handleInputChange}
        onSubmit={chat.handleSubmit}
        isLoading={chat.isLoading}
        placeholder="Ask me anything..."
      />
    </div>
  );
}`;

export const BASIC_CHAT_API_SOURCE = `import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { messages, systemPrompt } = await req.json();

  const result = streamText({
    model: openai("gpt-4"),
    system: systemPrompt || "You are a helpful AI assistant.",
    messages,
  });

  return result.toDataStreamResponse();
}`;
