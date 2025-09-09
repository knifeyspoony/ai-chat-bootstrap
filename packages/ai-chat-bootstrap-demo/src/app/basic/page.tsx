"use client";

import { ChatContainer, useAIChat } from "ai-chat-bootstrap";

export default function BasicChatPage() {
  const chat = useAIChat({
    api: "/api/chat",
    systemPrompt:
      "You are a helpful assistant. Answer as concisely as possible.",
  });

  return (
    <div className="h-screen flex flex-col p-8">
      <ChatContainer
        chat={chat}
        header={{
          title: "AI Chat Bootstrap Demo",
          avatar: "/acb.png",
        }}
      />
    </div>
  );
}
