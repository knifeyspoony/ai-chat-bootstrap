"use client";

import { ChatContainer, type UIMessage } from "ai-chat-bootstrap";
import { useMemo } from "react";

const LOW_BUDGET_MODEL = [
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    description: "2,048 token context window",
    contextWindowTokens: 2048,
    contextCompressionThreshold: 0.7,
  },
];

// Generate timestamps for the starter messages - last message is "now", working backwards
const now = Date.now();
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
    metadata: { timestamp: now - 33 * 60 * 1000 }, // 33 minutes ago
  },
  {
    id: "compression-assistant-1",
    role: "assistant" as const,
    parts: [
      {
        type: "text" as const,
        text: "Absolutely. I'll watch the token budget closely—feel free to pin any turns that must stay verbatim and I'll summarize the rest once we near the 2k limit.",
      },
    ],
    metadata: { timestamp: now - 30 * 60 * 1000 }, // 30 minutes ago
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
    metadata: { timestamp: now - 27 * 60 * 1000 }, // 27 minutes ago
  },
  {
    id: "compression-assistant-2",
    role: "assistant" as const,
    parts: [
      {
        type: "text" as const,
        text: "Great, I logged those under 'critical decisions'. Last quarter's attribution overhaul lifted assisted conversions by 12%, so I'll note that as context whenever we craft follow-up messaging.",
      },
    ],
    metadata: { timestamp: now - 24 * 60 * 1000 }, // 24 minutes ago
  },
  {
    id: "compression-user-3",
    role: "user" as const,
    parts: [
      {
        type: "text" as const,
        text: "Please also keep the marketing dashboard refresh milestones handy. We promised product an updated revenue by funnel widget, and design committed to shipping the visual polish pass next sprint.",
      },
    ],
    metadata: { timestamp: now - 21 * 60 * 1000 }, // 21 minutes ago
  },
  {
    id: "compression-assistant-3",
    role: "assistant" as const,
    parts: [
      {
        type: "text" as const,
        text: "Copy that. I have the dashboard timeline broken into: data plumbing this week, QA dashboards next Monday, and design polish once the QA checklist clears. I'll flag if QA slips into the release window.",
      },
    ],
    metadata: { timestamp: now - 18 * 60 * 1000 }, // 18 minutes ago
  },
  {
    id: "compression-user-4",
    role: "user" as const,
    parts: [
      {
        type: "text" as const,
        text: "Analytics still needs clarity on the experiment archive cadence. Can you note that we agreed to sweep inactive funnels every 45 days and escalate anything with budget over $5k?",
      },
    ],
    metadata: { timestamp: now - 15 * 60 * 1000 }, // 15 minutes ago
  },
  {
    id: "compression-assistant-4",
    role: "assistant" as const,
    parts: [
      {
        type: "text" as const,
        text: "Logged: archive cadence every 45 days, and auto-escalate experiments exceeding $5k in dormant spend. I'll remind finance to audit those before we run the next quarterly review.",
      },
    ],
    metadata: { timestamp: now - 12 * 60 * 1000 }, // 12 minutes ago
  },
  {
    id: "compression-user-5",
    role: "user" as const,
    parts: [
      {
        type: "text" as const,
        text: "Could you also capture the conversation around campaign tagging? Growth wants all paid social initiatives tagged with the new cohort taxonomy before we spin up the newsletter push.",
      },
    ],
    metadata: { timestamp: now - 9 * 60 * 1000 }, // 9 minutes ago
  },
  {
    id: "compression-assistant-5",
    role: "assistant" as const,
    parts: [
      {
        type: "text" as const,
        text: "Done. I'll mention that growth needs the taxonomy in place by Thursday so their UTM library exports cleanly into the CRM. That way, when we compress, the tagging expectation survives.",
      },
    ],
    metadata: { timestamp: now - 6 * 60 * 1000 }, // 6 minutes ago
  },
  {
    id: "compression-user-6",
    role: "user" as const,
    parts: [
      {
        type: "text" as const,
        text: "Last thing—record that sales wants a concise summary they can read before the Tuesday forecast call. They're specifically worried about the streaming cohort and the performance drop we spotted.",
      },
    ],
    metadata: { timestamp: now - 3 * 60 * 1000 }, // 3 minutes ago
  },
  {
    id: "compression-assistant-6",
    role: "assistant" as const,
    parts: [
      {
        type: "text" as const,
        text: "Added to the list. I'll generate a sales-ready recap that spotlights the streaming cohort softness, the retention experiments that still show promise, and any budget reallocations we commit to.",
      },
    ],
    metadata: { timestamp: now }, // Right now
  },
];

export default function CompressionDemoPage() {
  const compressionConfig = useMemo(
    () => ({
      enabled: true,
      model: LOW_BUDGET_MODEL[0]?.id,
    }),
    []
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 h-screen overflow-hidden">
      <div className="space-y-3 ">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold">Compression Playground</h1>
            <p className="text-sm text-muted-foreground">
              This thread starts with a dozen analytics sync messages so the low
              2,048 token budget fills up quickly. Pin critical turns, review
              artifacts, and watch the usage popover for reduction wins or error
              states once compression runs.
            </p>
          </div>
        </div>
      </div>

      <ChatContainer
        transport={{ api: "/api/chat" }}
        compression={compressionConfig}
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
          subtitle: "GPT-4.1 • 2,048 token budget",
        }}
        ui={{
          placeholder:
            "Ask for a recap, pin messages, or request another summary...",
          showTimestamps: true,
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
