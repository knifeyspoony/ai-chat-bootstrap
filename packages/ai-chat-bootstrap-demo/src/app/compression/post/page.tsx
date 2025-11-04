"use client";

import {
  ChatContainer,
  useAICompressionStore,
  type CompressionArtifact,
  type CompressionSnapshot,
  type CompressionUsage,
  type UIMessage,
} from "ai-chat-bootstrap";
import { useEffect, useRef } from "react";

const LOW_BUDGET_MODEL = [
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    description: "2,048 token context window",
    contextWindowTokens: 2048,
    contextCompressionThreshold: 0.7,
  },
];

const SNAPSHOT_ID = "analytics-sync-snapshot";
const SNAPSHOT_CREATED_AT = Date.parse("2024-06-24T15:32:00Z");
const PINNED_AT = SNAPSHOT_CREATED_AT - 60_000;

const HISTORICAL_USER: UIMessage = {
  id: "analytics-user-discovery",
  role: "user",
  parts: [
    {
      type: "text",
      text: "Quick recap: we audited paid social cohorts and found the aging campaigns still overspending. I'd like a plan but feel free to compress the exploratory chatter.",
    },
  ],
  metadata: {
    acbCompression: {
      compression: {
        snapshotId: SNAPSHOT_ID,
        compressedAt: SNAPSHOT_CREATED_AT,
        surviving: false,
        kind: "message",
        reason: "excluded",
      },
    },
  },
};

const HISTORICAL_ASSISTANT: UIMessage = {
  id: "analytics-assistant-recorder",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "Understood. Logging the cohort breakdown and the problematic CPA drift so we can prune it later if compression runs.",
    },
  ],
  metadata: {
    acbCompression: {
      compression: {
        snapshotId: SNAPSHOT_ID,
        compressedAt: SNAPSHOT_CREATED_AT,
        surviving: false,
        kind: "message",
        reason: "excluded",
      },
    },
  },
};

const PINNED_ASSISTANT: UIMessage = {
  id: "analytics-assistant-action-plan",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "Action plan: 1) Pause legacy lookalikes by Friday, 2) Shift 30% of budget to the winning mid-funnel segment, 3) Share refresh mockups with creative by Tuesday.",
    },
  ],
  metadata: {
    acbCompression: {
      pinned: {
        pinnedAt: PINNED_AT,
        pinnedBy: "user",
        reason: "Keep the concrete action items",
      },
      compression: {
        snapshotId: SNAPSHOT_ID,
        compressedAt: SNAPSHOT_CREATED_AT,
        surviving: true,
        kind: "message",
        reason: "survivor",
      },
    },
  },
};

const SURVIVING_USER: UIMessage = {
  id: "analytics-user-followup",
  role: "user",
  parts: [
    {
      type: "text",
      text: "Looks good. Can you also remind me which channels we agreed to archive after the experiment sunset?",
    },
  ],
  metadata: {
    acbCompression: {
      compression: {
        snapshotId: SNAPSHOT_ID,
        compressedAt: SNAPSHOT_CREATED_AT,
        surviving: true,
        kind: "message",
        reason: "survivor",
      },
    },
  },
};

const CURRENT_ASSISTANT: UIMessage = {
  id: "analytics-assistant-current",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "We archived TikTok Spark Ads and Reddit Carousel tests because they failed to clear the new efficiency floor. Everything else stayed live for now.",
    },
  ],
  metadata: {
    acbCompression: {
      compression: {
        snapshotId: SNAPSHOT_ID,
        compressedAt: SNAPSHOT_CREATED_AT,
        surviving: true,
        kind: "message",
        reason: "survivor",
      },
    },
  },
};

const COMPRESSION_EVENT_MESSAGE: UIMessage = {
  id: `compression-event-${SNAPSHOT_ID}`,
  role: "system",
  parts: [
    {
      type: "text",
      text: [
        "Context compression applied (threshold) at 2024-06-24T15:32:00.000Z.",
        "Tokens: before 2820, after 1320, saved 1500.",
        "Budget: 2048, remaining 728.",
        "Artifacts:\n • Analytics recap: Highlighted the budget shifts, archived channels, and outstanding creative tasks.",
      ].join("\n"),
    },
  ],
  metadata: {
    acbCompression: {
      compression: {
        snapshotId: SNAPSHOT_ID,
        compressedAt: SNAPSHOT_CREATED_AT,
        surviving: true,
        kind: "event",
        reason: "compression-event",
      },
    },
  },
};

const INITIAL_MESSAGES: UIMessage[] = [
  HISTORICAL_USER,
  HISTORICAL_ASSISTANT,
  PINNED_ASSISTANT,
  SURVIVING_USER,
  CURRENT_ASSISTANT,
  COMPRESSION_EVENT_MESSAGE,
];

const ARTIFACTS: CompressionArtifact[] = [
  {
    id: "artifact-analytics-recap",
    title: "Analytics recap",
    summary:
      "Paused legacy lookalikes, reallocated 30% budget to mid-funnel winners, and scheduled creative refresh by Tuesday. Archived TikTok Spark Ads + Reddit Carousel tests.",
    createdAt: SNAPSHOT_CREATED_AT,
    tokensSaved: 1500,
    sourceMessageIds: [HISTORICAL_USER.id, HISTORICAL_ASSISTANT.id],
  },
];

const SNAPSHOT: CompressionSnapshot = {
  id: SNAPSHOT_ID,
  createdAt: SNAPSHOT_CREATED_AT,
  survivingMessageIds: [
    PINNED_ASSISTANT.id,
    SURVIVING_USER.id,
    CURRENT_ASSISTANT.id,
    COMPRESSION_EVENT_MESSAGE.id,
  ],
  artifactIds: ARTIFACTS.map((artifact) => artifact.id),
  tokensBefore: 2820,
  tokensAfter: 1320,
  tokensSaved: 1500,
  reason: "threshold",
  excludedMessageIds: [HISTORICAL_USER.id, HISTORICAL_ASSISTANT.id],
};

const USAGE: CompressionUsage = {
  totalTokens: 1320,
  pinnedTokens: 220,
  artifactTokens: 160,
  survivingTokens: 940,
  remainingTokens: 728,
  budget: 2048,
  updatedAt: SNAPSHOT_CREATED_AT + 1000,
};

export default function PostCompressionDemoPage() {
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;

    const store = useAICompressionStore.getState();
    store.reset();
    store.setPinnedMessages([
      {
        id: PINNED_ASSISTANT.id,
        message: PINNED_ASSISTANT,
        pinnedAt: PINNED_AT,
        pinnedBy: "user",
        reason: "Keep the concrete action items",
      },
    ]);
    store.setArtifacts(ARTIFACTS);
    store.setSnapshot(SNAPSHOT);
    store.setUsage(USAGE, {
      shouldCompress: false,
      overBudget: false,
    });
    store.setModelMetadata({
      modelId: LOW_BUDGET_MODEL[0]?.id,
      modelLabel: LOW_BUDGET_MODEL[0]?.label,
      contextWindowTokens: LOW_BUDGET_MODEL[0]?.contextWindowTokens,
      lastUpdatedAt: SNAPSHOT_CREATED_AT,
    });

    return () => {
      useAICompressionStore.getState().reset();
    };
  }, []);

  return (
    <div className="mx-auto flex h-screen w-full max-w-6xl flex-col gap-8 overflow-hidden px-6 py-10">
      <div className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">
            Compression Snapshot (Ephemeral)
          </h1>
          <p className="text-sm text-muted-foreground">
            This thread simulates returning to a chat after compression already
            trimmed the transcript. Historical turns stay visible, a summary
            artifact captures the recap, and only the surviving messages will be
            sent on the next request.
          </p>
        </div>
      </div>

      <ChatContainer
        transport={{ api: "/api/chat" }}
        compression={{
          enabled: true,
          model: LOW_BUDGET_MODEL[0]?.id,
        }}
        messages={{
          initial: INITIAL_MESSAGES,
          systemPrompt:
            "You are an efficient meeting assistant. Keep the compression summary in sync if new context arrives.",
        }}
        features={{
          chainOfThought: false,
          branching: true,
        }}
        models={{
          available: LOW_BUDGET_MODEL,
          initial: LOW_BUDGET_MODEL[0].id,
        }}
        header={{
          title: "AI Assistant",
          subtitle: "Post-compression snapshot",
        }}
        ui={{
          placeholder: "Pick up the conversation or request another recap…",
        }}
        suggestions={{
          enabled: true,
          count: 3,
          prompt:
            "Suggest prompts that inspect the saved artifact, ask what was trimmed, or request a fresh summary.",
        }}
        commands={{ enabled: true }}
        assistantActions={{ copy: true, regenerate: true, debug: true }}
      />
    </div>
  );
}
