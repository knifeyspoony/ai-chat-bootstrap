module.exports = (twNative) => `"use client";
import { ChatContainer, useAIChat } from 'ai-chat-bootstrap';

export default function ChatPage() {
  const chat = useAIChat({ api: '/api/chat', systemPrompt: 'You are a helpful AI assistant.' });
  return (
    <div className="max-w-xl mx-auto py-8 ${twNative ? "" : "px-4"}">
      <ChatContainer chat={chat} header={{ title: 'AI Assistant' }} suggestions={{ enabled: true, count: 3 }} commands={{ enabled: true }} />
    </div>
  );
}
`;
