"use client";

import { useEphemeralChatThreads } from "@/hooks/use-ephemeral-chat-threads";
import { ChatContainer } from "ai-chat-bootstrap";

const DEMO_MODELS = [
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "gpt-5", label: "GPT-5" },
];

export default function BasicChatPage() {
  useEphemeralChatThreads();

  // Optional: keep a scope key to partition threads in this demo route
  const scopeKey = "basic-demo";

  return (
    <div className="h-screen flex flex-col p-8">
      <ChatContainer
        transport={{ api: "/api/chat" }}
        messages={{
          systemPrompt:
            "You are a helpful assistant. Answer as concisely as possible.",
        }}
        features={{ chainOfThought: true }}
        models={{
          available: DEMO_MODELS,
          initial: "gpt-4o",
        }}
        header={{
          title: "AI Chat Bootstrap Demo",
          avatar: "/acb.png",
        }}
        threads={{
          enabled: true,
          scopeKey,
          autoCreate: true,
          title: {
            enabled: true,
            api: "/api/thread-title",
          },
        }}
      />
    </div>
  );
}
