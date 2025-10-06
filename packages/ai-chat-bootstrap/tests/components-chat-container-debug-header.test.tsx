// @vitest-environment jsdom
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./setup-transform-stream";
import { MockChatContainer } from "../lib/components/chat/chat-container";
vi.mock("../lib/components/chat/chat-messages", () => ({
  ChatMessages: React.forwardRef<HTMLDivElement>((_, ref) => (
    <div ref={ref} data-testid="chat-messages" />
  )),
}));

vi.mock("../lib/components/chat/chat-input-with-commands", () => ({
  ChatInputWithCommands: () => (
    <form data-testid="chat-input" onSubmit={(event) => event.preventDefault()} />
  ),
}));

vi.mock("../lib/components/chat/chat-threads-button", () => ({
  ChatThreadsButton: () => <div data-testid="threads-button" />,
}));

vi.mock("../lib/components/chat/mcp-servers-button", () => ({
  McpServersButton: () => <div data-testid="mcp-button" />,
}));

function createChatAdapter() {
  return {
    messages: [],
    isLoading: false,
    status: "idle" as const,
    input: "",
    setInput: vi.fn(),
    model: undefined,
    setModel: vi.fn(),
    models: [],
    threadId: undefined,
    scopeKey: "test-scope",
    chainOfThoughtEnabled: false,
    branching: false,
    mcpEnabled: false,
    sendMessageWithContext: vi.fn(),
    sendAICommandMessage: vi.fn(),
    regenerate: vi.fn(),
    compression: undefined,
  };
}

const originalNodeEnv = process.env.NODE_ENV;

describe("ChatContainer debug header button", () => {
  beforeEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  afterEach(() => {
    cleanup();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("does not render the debug button by default in development", () => {
    render(
      <MockChatContainer
        chat={createChatAdapter()}
        header={{ title: "Test Chat" }}
      />
    );

    expect(
      screen.queryByRole("button", { name: /debug tools/i })
    ).toBeNull();
  });

  it("renders the debug button when explicitly enabled in development", async () => {
    render(
      <MockChatContainer
        chat={createChatAdapter()}
        header={{ title: "Test Chat" }}
        devtools={{ headerDebugButton: true }}
      />
    );

    const button = await screen.findByRole("button", { name: /debug tools/i });
    expect(button).toBeDefined();
  });

  it("never renders the debug button in production", () => {
    process.env.NODE_ENV = "production";

    render(
      <MockChatContainer
        chat={createChatAdapter()}
        header={{ title: "Test Chat" }}
        devtools={{ headerDebugButton: true }}
      />
    );

    expect(
      screen.queryByRole("button", { name: /debug tools/i })
    ).toBeNull();
  });
});
