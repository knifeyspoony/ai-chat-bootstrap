import type { UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";
import {
  ensureMessageMetadata,
  normalizeMessagesMetadata,
} from "../lib/utils/message-normalization";

const makeMessage = (id: string, metadata?: UIMessage["metadata"]): UIMessage => ({
  id,
  role: "user",
  parts: [
    {
      type: "text",
      text: `message-${id}`,
    } as UIMessage["parts"][number],
  ],
  metadata,
});

describe("message normalization utilities", () => {
  it("ensures metadata object on individual messages", () => {
    const original = makeMessage("m-1", undefined);
    const { message, changed } = ensureMessageMetadata(original);
    expect(changed).toBe(true);
    expect(message).not.toBe(original);
    expect(message.metadata).toEqual({});
  });

  it("preserves messages order while normalizing metadata", () => {
    const a = makeMessage("a", undefined);
    const b = makeMessage("b", undefined);
    const { messages, changed } = normalizeMessagesMetadata([a, b]);
    expect(changed).toBe(true);
    expect(messages).toHaveLength(2);
    expect(messages[0]?.id).toBe("a");
    expect(messages[1]?.id).toBe("b");
    expect(messages[0]?.metadata).toEqual({});
    expect(messages[1]?.metadata).toEqual({});
  });

  it("stamps timestamps when requested", () => {
    const a = makeMessage("a", undefined);
    const b = makeMessage("b", undefined);
    const factory = vi.fn(() => 123456);
    const { messages, changed } = normalizeMessagesMetadata([a, b], {
      shouldStampTimestamp: (_message, index) => index === 1,
      timestampFactory: factory,
    });

    expect(changed).toBe(true);
    expect(factory).toHaveBeenCalledOnce();
    expect(messages[0]?.metadata).toEqual({});
    expect(messages[1]?.metadata).toMatchObject({ timestamp: 123456 });
  });

  it("avoids reallocating when metadata is already normalized", () => {
    const withMetadata = makeMessage("c", { timestamp: 42 });
    const { messages, changed } = normalizeMessagesMetadata([withMetadata]);
    expect(changed).toBe(false);
    expect(messages[0]).toBe(withMetadata);
  });
});
