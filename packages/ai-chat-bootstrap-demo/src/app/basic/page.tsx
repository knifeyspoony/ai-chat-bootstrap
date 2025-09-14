"use client";

import { ChatContainer, useAIChat } from "ai-chat-bootstrap";
import { useState } from "react";

export default function BasicChatPage() {
  // Optional: keep a scope key to partition threads in this demo route
  const scopeKey = "basic-demo";
  const [threadId, setThreadId] = useState<string | undefined>(undefined);

  const chat = useAIChat({
    api: "/api/chat",
    systemPrompt:
      "You are a helpful assistant. Answer as concisely as possible.",
    threadId,
    scopeKey,
    autoCreateThread: true,
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
          scopeKey,
          onThreadChange: setThreadId,
        }}
      />
    </div>
  );
}
