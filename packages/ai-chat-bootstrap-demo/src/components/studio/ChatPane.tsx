"use client";
import { ChatContainer } from "ai-chat-bootstrap";

interface ChatLike {
  // minimal shape used by ChatContainer; real hook returns more
  messages: unknown[];
}
interface ChatPaneProps {
  chat: ChatLike;
}

export function ChatPane({ chat }: ChatPaneProps) {
  return (
    <main className="flex flex-col h-full overflow-hidden">
      <ChatContainer
        // casting to any to avoid pulling deep internal types for demo scaffolding
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chat={chat as any}
        header={{
          title: "Studio Chat",
          subtitle: "Research Assistant",
        }}
        suggestions={{ enabled: true, count: 3 }}
        commands={{ enabled: true }}
      />
    </main>
  );
}
