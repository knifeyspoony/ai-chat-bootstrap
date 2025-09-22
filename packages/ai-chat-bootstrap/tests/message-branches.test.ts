import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import {
  appendMessageBranchVersion,
  buildBranchMessages,
  getMessageBranchMetadata,
  MESSAGE_BRANCH_METADATA_KEY,
  promoteMessageBranch,
} from "../lib/utils/message-branches";

describe("message branching utilities", () => {
  const buildMessage = (parts: string, metadata?: UIMessage["metadata"]) =>
    ({
      id: "assistant-1",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: parts,
        } as UIMessage["parts"][number],
      ],
      metadata,
    }) satisfies UIMessage;

  it("appends branch versions with stable sequencing", () => {
    const base = buildMessage("current");

    const first = appendMessageBranchVersion(base, (count) => `branch-${count}`);
    expect(first.updatedMessage.metadata?.[MESSAGE_BRANCH_METADATA_KEY]).toBeDefined();

    const firstMeta = getMessageBranchMetadata(first.updatedMessage);
    expect(firstMeta?.versions).toHaveLength(1);
    expect(firstMeta?.versions[0]?.parts?.[0]).toMatchObject({ text: "current" });
    expect(firstMeta?.sequence).toBe(1);

    const second = appendMessageBranchVersion(first.updatedMessage, (count) => `branch-${count}`);
    const secondMeta = getMessageBranchMetadata(second.updatedMessage);
    expect(secondMeta?.versions).toHaveLength(2);
    expect(secondMeta?.sequence).toBe(2);
  });

  it("promotes an existing branch to canonical message parts", () => {
    const base = buildMessage("current", {
      [MESSAGE_BRANCH_METADATA_KEY]: {
        versions: [
          {
            id: "assistant-1::v1",
            parts: [
              {
                type: "text",
                text: "older variant",
              } as UIMessage["parts"][number],
            ],
            timestamp: 123,
          },
        ],
        sequence: 1,
      },
    });

    const result = promoteMessageBranch(base, "assistant-1::v1", {
      createId: (count) => `assistant-1::v${count + 1}`,
      timestamp: 999,
    });

    expect(result.changed).toBe(true);
    expect(result.updatedMessage.parts?.[0]).toMatchObject({ text: "older variant" });

    const metadata = getMessageBranchMetadata(result.updatedMessage);
    expect(metadata?.versions).toHaveLength(1);
    const [demoted] = metadata?.versions ?? [];
    expect(demoted?.id).toBe("assistant-1::v2");
    expect(demoted?.parts?.[0]).toMatchObject({ text: "current" });
    expect(demoted?.timestamp).toBe(999);
    expect(metadata?.sequence).toBe(2);
  });

  it("returns unchanged when promoting unknown branch", () => {
    const base = buildMessage("current");
    const result = promoteMessageBranch(base, "missing");
    expect(result.changed).toBe(false);
    expect(result.updatedMessage).toBe(base);
  });

  it("provides canonical message last in buildBranchMessages", () => {
    const base = buildMessage("current");
    const appended = appendMessageBranchVersion(base, (count) => `branch-${count}`);
    const { branches } = buildBranchMessages(appended.updatedMessage);
    expect(branches.at(-1)?.id).toBe("assistant-1");
  });
});
