import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { computeMessagesSignature } from "../lib/utils/message-signature";

describe("computeMessagesSignature", () => {
  const baseUserMessage: UIMessage = {
    id: "user-1",
    role: "user",
    parts: [{ type: "text", text: "hello" }],
  };

  const baseToolMessage: UIMessage = {
    id: "assistant-1",
    role: "assistant",
    parts: [
      {
        type: "tool-alert_context",
        toolCallId: "call-1",
        state: "input-available",
        input: { query: "load alerts" },
      },
    ],
  };

  it("changes signature when message parts are updated in place", () => {
    const initial = [baseUserMessage, baseToolMessage];
    const toolCompleted: UIMessage = {
      ...baseToolMessage,
      parts: [
        {
          ...baseToolMessage.parts?.[0],
          state: "output-available",
          output: { status: "ok" },
        } as any,
      ],
    };
    const updated = [baseUserMessage, toolCompleted];

    const before = computeMessagesSignature(initial);
    const after = computeMessagesSignature(updated);

    expect(before).not.toEqual(after);
  });

  it("produces identical signatures for identical message snapshots", () => {
    const messages = [baseUserMessage, baseToolMessage];
    const signatureA = computeMessagesSignature(messages);
    const signatureB = computeMessagesSignature(messages);
    expect(signatureA).toEqual(signatureB);
  });

  it("detects thread length changes", () => {
    const messages = [baseUserMessage];
    const longer = [baseUserMessage, baseToolMessage];
    expect(computeMessagesSignature(messages)).not.toEqual(
      computeMessagesSignature(longer)
    );
  });
});
