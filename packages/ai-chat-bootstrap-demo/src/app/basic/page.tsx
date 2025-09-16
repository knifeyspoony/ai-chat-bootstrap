"use client";

import { useEphemeralChatThreads } from "@/hooks/use-ephemeral-chat-threads";
import { ChatContainer, useAIChat } from "ai-chat-bootstrap";

const DEMO_MODELS = [
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "gpt-5", label: "GPT-5" },
];

export default function BasicChatPage() {
  useEphemeralChatThreads();

  // Optional: keep a scope key to partition threads in this demo route
  const scopeKey = "basic-demo";

  const chat = useAIChat({
    api: "/api/chat",
    systemPrompt:
      "You are a helpful assistant. Answer as concisely as possible.",
    scopeKey,
    autoCreateThread: true,
    threadTitleApi: "/api/thread-title",
    enableChainOfThought: true,
    models: DEMO_MODELS,
    model: "gpt-4o",
  });

  return (
    <div className="h-screen flex flex-col p-8">
      <ChatContainer
        chat={chat}
        header={{
          title: "AI Chat Bootstrap Demo",
          avatar: "/acb.png",
        }}
        threads={{
          enabled: true,
        }}
      />
    </div>
  );
}
