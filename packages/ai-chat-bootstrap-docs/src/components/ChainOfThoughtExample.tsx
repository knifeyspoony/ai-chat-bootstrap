"use client";

import { MockChatContainer, type UIMessage } from "ai-chat-bootstrap";
import { useMockAIChat } from "./shared/useMockAIChat";

const INITIAL_MESSAGES: UIMessage[] = [
  {
    id: "user_onboarding_request",
    role: "user",
    parts: [
      {
        type: "text",
        text: "Can you outline the onboarding plan for ACME Corp?",
      },
    ],
  },
  {
    id: "assistant_chain_of_thought",
    role: "assistant",
    parts: [
      {
        type: "tool-acb_start_chain_of_thought",
        toolCallId: "cot_plan",
        state: "input-available",
        input: {
          name: "Plan ACME customer onboarding",
          description: "Collect notes and prepare a schedule before replying.",
        },
      },
      {
        type: "tool-acb_start_chain_of_thought_step",
        toolCallId: "cot_step_review",
        state: "input-available",
        input: {
          name: "Review recent customer activity",
          description: "Check CRM entries and support tickets.",
        },
      },
      {
        type: "reasoning",
        text: "Scanning the CRM timeline and latest support summary.",
      },
      {
        type: "tool-acb_start_chain_of_thought_step",
        toolCallId: "cot_step_milestones",
        state: "input-available",
        input: {
          name: "Draft rollout milestones",
        },
      },
      {
        type: "reasoning",
        text: "Mapping the work into kickoff, configuration, and training phases.",
      },
      {
        type: "tool-acb_complete_chain_of_thought",
        toolCallId: "cot_plan_complete",
        state: "input-available",
        input: {
          summary: "Prepared a three-step onboarding plan for ACME.",
        },
      },
      {
        type: "text",
        text: [
          "Here’s how we’ll approach the onboarding:",
          "\n\n1. Kickoff tomorrow to confirm goals.",
          "\n2. Configure integrations by Friday.",
          "\n3. Train the ACME success team early next week.",
        ].join(""),
      },
    ],
  },
];

export function ChainOfThoughtExample() {
  const chat = useMockAIChat({
    initialMessages: INITIAL_MESSAGES,
    responseGenerator: () =>
      "This demo is read-only. Enable chain of thought in your own chat to stream live plans.",
    responseDelay: 0,
  });

  // Force chain of thought UI for the mock chat and keep the transcript static
  chat.chainOfThoughtEnabled = true;
  chat.sendMessageWithContext = () => {};
  chat.retryLastMessage = () => {};

  return (
    <div className="h-[600px] w-full">
      <MockChatContainer
        chat={chat}
        header={{
          title: "Reasoning Assistant",
          subtitle: "Chain of Thought demo",
        }}
        ui={{
          placeholder: "This example is read-only and pre-populated.",
        }}
      />
    </div>
  );
}

export const CHAIN_OF_THOUGHT_EXAMPLE_SOURCE = `"use client";
import { ChatContainer, type UIMessage } from "ai-chat-bootstrap";

const initialMessages: UIMessage[] = [
  {
    id: "user_onboarding_request",
    role: "user",
    parts: [
      { type: "text", text: "Can you outline the onboarding plan for ACME Corp?" },
    ],
  },
  {
    id: "assistant_chain_of_thought",
    role: "assistant",
    parts: [
      {
        type: "tool-acb_start_chain_of_thought",
        toolCallId: "cot_plan",
        state: "input-available",
        input: {
          name: "Plan ACME customer onboarding",
          description: "Collect notes and prepare a schedule before replying.",
        },
      },
      {
        type: "tool-acb_start_chain_of_thought_step",
        toolCallId: "cot_step_review",
        state: "input-available",
        input: {
          name: "Review recent customer activity",
          description: "Check CRM entries and support tickets.",
        },
      },
      {
        type: "reasoning",
        text: "Scanning the CRM timeline and latest support summary.",
      },
      {
        type: "tool-acb_start_chain_of_thought_step",
        toolCallId: "cot_step_milestones",
        state: "input-available",
        input: {
          name: "Draft rollout milestones",
        },
      },
      {
        type: "reasoning",
        text: "Mapping the work into kickoff, configuration, and training phases.",
      },
      {
        type: "tool-acb_complete_chain_of_thought",
        toolCallId: "cot_plan_complete",
        state: "input-available",
        input: {
          summary: "Prepared a three-step onboarding plan for ACME.",
        },
      },
      {
        type: "text",
        text: 'Here’s how we’ll approach the onboarding:\\n\\n1. Kickoff tomorrow to confirm goals.\\n2. Configure integrations by Friday.\\n3. Train the ACME success team early next week.',
      },
    ],
  },
];

export function ChainOfThoughtTranscript() {
  return (
    <ChatContainer
      transport={{ api: "/api/chat" }}
      messages={{ initial: initialMessages }}
      features={{ chainOfThought: true }}
      header={{ title: "Reasoning Assistant" }}
      ui={{ placeholder: "Ask about the plan…" }}
    />
  );
}`;
