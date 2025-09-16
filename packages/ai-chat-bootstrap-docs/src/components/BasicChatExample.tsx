"use client";
import { ChatContainer } from "ai-chat-bootstrap";
import { useMockAIChat } from "./shared/useMockAIChat";

// A super lightweight mock chat producing a canned assistant reply.
export function BasicChatExample() {
  const chat = useMockAIChat();

  return (
    <div className="h-[420px] w-full">
      <ChatContainer
        chat={chat}
        header={{ title: "AI Assistant", subtitle: "Connected to AI" }}
        ui={{ placeholder: "Ask me anything..." }}
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
  header={{ title: "AI Assistant", subtitle: "Connected to AI" }}
  ui={{ placeholder: "Ask me anything..." }}
  chat={chat}
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
