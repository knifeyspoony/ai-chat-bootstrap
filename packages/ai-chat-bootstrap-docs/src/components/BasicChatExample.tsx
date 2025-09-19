"use client";
import { MockChatContainer } from "ai-chat-bootstrap";
import { useMockAIChat } from "./shared/useMockAIChat";

// A super lightweight mock chat producing a canned assistant reply.
export function BasicChatExample() {
  const chat = useMockAIChat();

  return (
    <div className="h-[600px] w-full">
      <MockChatContainer
        chat={chat}
        header={{ title: "AI Assistant", subtitle: "Connected to AI" }}
        ui={{ placeholder: "Ask me anything..." }}
      />
    </div>
  );
}

export const BASIC_CHAT_SOURCE = `"use client";
import React from "react";
import { ChatContainer } from "ai-chat-bootstrap";

export function BasicChat() {
  return (
    <div className="h-[600px] w-full">
      <ChatContainer
        transport={{ api: "/api/chat" }}
        messages={{ systemPrompt: "You are a helpful AI assistant." }}
        header={{ title: "AI Assistant", subtitle: "Connected to AI" }}
        ui={{ placeholder: "Ask me anything..." }}
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
