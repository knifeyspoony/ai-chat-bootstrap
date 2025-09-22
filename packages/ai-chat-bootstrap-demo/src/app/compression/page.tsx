"use client";

import { ChatContainer, type UIMessage } from "ai-chat-bootstrap";

const LOW_BUDGET_MODEL = [
  {
    id: "gpt-4o",
    label: "GPT-4o",
    description: "2,048 token context window",
    contextWindowTokens: 2048,
    contextCompressionThreshold: 0.7,
  },
];

const STARTER_MESSAGES: UIMessage[] = [
  {
    id: "compression-user-1",
    role: "user" as const,
    parts: [
      {
        type: "text" as const,
        text: "Can you capture the highlights from our last analytics sync so we can trim the rest of the conversation if needed?",
      },
    ],
  },
  {
    id: "compression-assistant-1",
    role: "assistant" as const,
    parts: [
      {
        type: "text" as const,
        text: "Absolutely. I'll watch the token budget closely - feel free to pin any turns that must stay verbatim and I'll summarize the rest once we near the 2k limit.",
      },
    ],
  },
  {
    id: "compression-user-2",
    role: "user" as const,
    parts: [
      {
        type: "text" as const,
        text: "Key takeaways were: attribution updates, the marketing dashboard refresh plan, and the decision to archive inactive experiments after 45 days.",
      },
    ],
  },
];

export default function CompressionDemoPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 h-screen overflow-hidden">
      <div className="space-y-3 ">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold">Compression Playground</h1>
            <p className="text-sm text-muted-foreground">
              Explore how the chat automatically summarizes history when the low
              2,048 token budget is hit. Pin critical turns, review artifacts,
              and watch the usage popover for error states.
            </p>
          </div>
        </div>
      </div>

      <ChatContainer
        transport={{ api: "/api/chat" }}
        compression={{
          enabled: true,
        }}
        messages={{
          initial: STARTER_MESSAGES,
          systemPrompt:
            "You are an efficient meeting assistant. Keep track of context compression and call out when you summarize older turns.",
        }}
        features={{
          chainOfThought: true,
          branching: true,
        }}
        models={{
          available: LOW_BUDGET_MODEL,
          initial: LOW_BUDGET_MODEL[0].id,
        }}
        header={{
          title: "AI Assistant",
          subtitle: "GPT-4o • 2,048 token budget",
        }}
        ui={{
          placeholder:
            "Ask for a recap, pin messages, or request another summary...",
        }}
        suggestions={{
          enabled: true,
          count: 3,
          prompt:
            "Suggest follow-up questions that stress-test the compression system: ask for recaps, compare artifacts, or request pinned items.",
        }}
        commands={{ enabled: true }}
        assistantActions={{ copy: true, regenerate: true, debug: true }}
      />
    </div>
  );
}
