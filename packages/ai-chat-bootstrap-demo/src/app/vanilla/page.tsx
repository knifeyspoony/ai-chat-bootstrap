"use client";

import { useEphemeralChatThreads } from "@/hooks/use-ephemeral-chat-threads";
import { ChatContainer, type UIMessage } from "ai-chat-bootstrap";

const VANILLA_MODEL = [
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    description: "General purpose model",
  },
];

const STARTER_MESSAGES: UIMessage[] = [
  {
    id: "vanilla-assistant-1",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "Welcome to the vanilla chat playground—threads and compression are fully switched off here, so each message stays in a single in-memory conversation.",
      },
    ],
  },
];

export default function VanillaChatDemoPage() {
  useEphemeralChatThreads();

  return (
    <div className="mx-auto flex h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Vanilla Chat</h1>
        <p className="text-sm text-muted-foreground">
          A minimal configuration that keeps everything in-memory. Use this page
          to verify integrations that expect threads and compression to stay
          disabled.
        </p>
      </div>

      <ChatContainer
        transport={{ api: "/api/chat" }}
        messages={{
          systemPrompt:
            "You are a friendly assistant for the vanilla demo. Keep answers short and practical.",
          initial: STARTER_MESSAGES,
        }}
        models={{
          available: VANILLA_MODEL,
          initial: VANILLA_MODEL[0]?.id,
        }}
        threads={{
          enabled: false,
        }}
        compression={{
          enabled: false,
        }}
        features={{
          chainOfThought: false,
          branching: false,
        }}
        ui={{
          placeholder:
            "Try sending a message—everything stays in this session.",
        }}
        devTools={{
          enabled: true,
        }}
      />
    </div>
  );
}
