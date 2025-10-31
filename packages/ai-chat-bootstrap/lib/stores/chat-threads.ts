import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { UIMessage } from "ai";
import type {
  ChatThread,
  ChatThreadPersistence,
  ChatThreadRecord,
  ChatThreadSummary,
  ChatThreadTimeline,
  CreateThreadOptions,
} from "../types/threads";
import { getDefaultChatThreadPersistence } from "../persistence/chat-threads-indexeddb";
import { normalizeMessagesMetadata } from "../utils/message-normalization";
import {
  materializeMessageState,
  reconcileThreadMessageState,
  type ThreadMessageState,
} from "../utils/thread-message-state";

type ChatThreadsMode = "persistent" | "ephemeral";

interface StoredTimeline {
  state: ThreadMessageState;
  updatedAt: number;
  snapshot: ChatThreadTimeline;
}

interface ChatThreadsState {
  scopeKey?: string;
  records: Map<string, ChatThreadRecord>;
  timelines: Map<string, StoredTimeline>;
  activeThreadId?: string;
  isSummariesLoaded: boolean;
  persistence?: ChatThreadPersistence;
  mode: ChatThreadsMode;

  initializePersistent: (persistence?: ChatThreadPersistence) => void;
  initializeEphemeral: () => void;
  setScopeKey: (scopeKey?: string) => void;
  setPersistence: (persistence?: ChatThreadPersistence) => void;
  setActiveThread: (id?: string) => void;

  listSummaries: (scopeKey?: string) => ChatThreadSummary[];
  loadSummaries: (scopeKey?: string) => Promise<void>;

  getRecord: (id: string) => ChatThreadRecord | undefined;
  getThread: (id: string) => ChatThread | undefined;
  getTimeline: (id: string) => ChatThreadTimeline | undefined;
  ensureTimeline: (id: string) => Promise<ChatThreadTimeline | null>;
  unloadTimeline: (id: string) => void;

  createThread: (opts?: CreateThreadOptions) => ChatThreadRecord;
  updateThreadMessages: (id: string, messages: UIMessage[]) => void;
  renameThread: (id: string, title: string, opts?: { manual?: boolean; allowAutoReplace?: boolean }) => void;
  updateThreadMetadata: (id: string, patch: Record<string, unknown>) => void;
  deleteThread: (id: string) => Promise<void>;
}

function ensureMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object") return {};
  if (Array.isArray(metadata)) return {};
  return { ...metadata };
}

function createRecordFromState(
  base: Partial<ChatThreadRecord> & { id: string },
  timeline: StoredTimeline,
  timestamps: { createdAt: number; updatedAt: number }
): ChatThreadRecord {
  return {
    id: base.id,
    parentId: base.parentId,
    scopeKey: base.scopeKey,
    title: base.title,
    metadata: ensureMetadata(base.metadata),
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
    messageCount: timeline.state.length,
    messageSignature: timeline.state.signature,
  };
}

function withUpdatedRecord(
  state: ChatThreadsState,
  record: ChatThreadRecord
): Map<string, ChatThreadRecord> {
  const next = new Map(state.records);
  next.set(record.id, record);
  return next;
}

function withUpdatedTimeline(
  state: ChatThreadsState,
  id: string,
  timeline: StoredTimeline | undefined
): Map<string, StoredTimeline> {
  const next = new Map(state.timelines);
  if (timeline) {
    next.set(id, timeline);
  } else {
    next.delete(id);
  }
  return next;
}

export const useChatThreadsStore = create<ChatThreadsState>((set, get) => ({
  scopeKey: undefined,
  records: new Map<string, ChatThreadRecord>(),
  timelines: new Map<string, StoredTimeline>(),
  activeThreadId: undefined,
  isSummariesLoaded: false,
  persistence: getDefaultChatThreadPersistence(),
  mode: "persistent",

  initializePersistent: (persistence?: ChatThreadPersistence) => {
    const nextPersistence = persistence ?? getDefaultChatThreadPersistence();
    const hasPersistence = Boolean(nextPersistence);
    set({
      scopeKey: undefined,
      records: new Map(),
      timelines: new Map(),
      activeThreadId: undefined,
      isSummariesLoaded: false,
      persistence: nextPersistence,
      mode: hasPersistence ? "persistent" : "ephemeral",
    });
  },

  initializeEphemeral: () => {
    set({
      scopeKey: undefined,
      records: new Map(),
      timelines: new Map(),
      activeThreadId: undefined,
      isSummariesLoaded: false,
      persistence: undefined,
      mode: "ephemeral",
    });
  },

  setScopeKey: (scopeKey?: string) => {
    const prev = get().scopeKey;
    if (prev === scopeKey) return;
    set({ scopeKey, isSummariesLoaded: false });
  },

  setPersistence: (persistence?: ChatThreadPersistence) => {
    set({
      persistence,
      mode: persistence ? "persistent" : "ephemeral",
    });
  },

  setActiveThread: (id?: string) => set({ activeThreadId: id }),

  listSummaries: (scopeKey?: string) => {
    const key = scopeKey ?? get().scopeKey;
    const summaries = Array.from(get().records.values());
    const filtered = key ? summaries.filter((s) => s.scopeKey === key) : summaries;
    filtered.sort((a, b) => b.updatedAt - a.updatedAt);
    return filtered;
  },

  loadSummaries: async (scopeKey?: string) => {
    const p = get().persistence;
    if (!p) {
      set({ isSummariesLoaded: true });
      return;
    }
    const key = scopeKey ?? get().scopeKey;
    try {
      const summaries = await p.loadSummaries(key);
      set((state) => {
        const nextRecords = new Map(state.records);
        const nextTimelines = new Map(state.timelines);
        const scopeIds = new Set<string>(summaries.map((summary) => summary.id));
        for (const summary of summaries) {
          nextRecords.set(summary.id, {
            ...summary,
            metadata: ensureMetadata(summary.metadata),
          });
        }
        // Remove records (and any cached timelines) that no longer exist in persistence for the scope
        for (const [id, record] of state.records.entries()) {
          const matchesScope = key ? record.scopeKey === key : true;
          if (matchesScope && !scopeIds.has(id)) {
            nextRecords.delete(id);
            nextTimelines.delete(id);
          }
        }
        const activeThreadId = state.activeThreadId;
        let nextActiveThreadId = activeThreadId && nextRecords.has(activeThreadId) ? activeThreadId : undefined;
        const fallbackSummary = summaries[0];
        if (!nextActiveThreadId && fallbackSummary && nextRecords.has(fallbackSummary.id)) {
          nextActiveThreadId = fallbackSummary.id;
        }
        return {
          records: nextRecords,
          timelines: nextTimelines,
          isSummariesLoaded: true,
          activeThreadId: nextActiveThreadId,
        };
      });

      // Refresh timeline cache for the fallback thread when needed to ensure messages load eagerly
      const fallbackId = summaries[0]?.id;
      if (fallbackId) {
        const state = get();
        const hasTimeline = state.timelines.has(fallbackId);
        if (!hasTimeline) {
          state.ensureTimeline(fallbackId).catch(() => {});
        }
      }
    } catch {
      set({ isSummariesLoaded: true });
    }
  },

  getRecord: (id: string) => get().records.get(id),

  getThread: (id: string) => {
    const record = get().records.get(id);
    if (!record) return undefined;
    const stored = get().timelines.get(id);
    return { record, timeline: stored?.snapshot };
  },

  getTimeline: (id: string) => get().timelines.get(id)?.snapshot,

  ensureTimeline: async (id: string) => {
    const existing = get().timelines.get(id);
    if (existing) {
      return existing.snapshot ?? null;
    }
    const p = get().persistence;
    if (!p) return null;
    try {
      const timelineSnapshot = await p.loadTimeline(id);
      if (!timelineSnapshot) return null;
      const { messages: normalizedMessages } =
        normalizeMessagesMetadata(timelineSnapshot.messages ?? []);
      const state = reconcileThreadMessageState(normalizedMessages);
      const snapshot: ChatThreadTimeline = {
        threadId: id,
        signature: state.signature,
        messages: materializeMessageState(state),
        updatedAt: timelineSnapshot.updatedAt,
      };
      const stored: StoredTimeline = {
        state,
        updatedAt: timelineSnapshot.updatedAt,
        snapshot,
      };
      set((prev) => {
        const updatedRecords = (() => {
          const record = prev.records.get(id);
          if (!record) return prev.records;
          if (
            record.messageSignature === state.signature &&
            record.messageCount === state.length &&
            record.updatedAt >= timelineSnapshot.updatedAt
          ) {
            return prev.records;
          }
          const updatedRecord: ChatThreadRecord = {
            ...record,
            messageSignature: state.signature,
            messageCount: state.length,
            updatedAt: Math.max(record.updatedAt, timelineSnapshot.updatedAt),
          };
          return withUpdatedRecord(prev, updatedRecord);
        })();
        return {
          timelines: withUpdatedTimeline(prev, id, stored),
          records: updatedRecords,
        };
      });
      return {
        threadId: id,
        signature: state.signature,
        messages: snapshot.messages,
        updatedAt: timelineSnapshot.updatedAt,
      };
    } catch {
      return null;
    }
  },

  unloadTimeline: (id: string) => {
    set((state) => ({
      timelines: withUpdatedTimeline(state, id, undefined),
    }));
  },

  createThread: (opts?: CreateThreadOptions) => {
    const createdAt = Date.now();
    const id = opts?.id ?? uuidv4();
    const scopeKey = opts?.scopeKey ?? get().scopeKey;
    const { messages: normalizedMessages } = normalizeMessagesMetadata(
      opts?.initialMessages ?? []
    );
    const state = reconcileThreadMessageState(normalizedMessages);
    const stored: StoredTimeline = {
      state,
      updatedAt: createdAt,
      snapshot: {
        threadId: id,
        signature: state.signature,
        messages: materializeMessageState(state),
        updatedAt: createdAt,
      },
    };
    const record = createRecordFromState(
      {
        id,
        parentId: opts?.parentId,
        scopeKey,
        title: opts?.title,
        metadata: opts?.metadata,
      },
      stored,
      { createdAt, updatedAt: createdAt }
    );

    set((prev) => ({
      records: withUpdatedRecord(prev, record),
      timelines: withUpdatedTimeline(prev, id, stored),
      activeThreadId: id,
    }));

    const persistence = get().persistence;
    if (persistence) {
      persistence
        .saveRecord(record)
        .then(() => persistence.saveTimeline(stored.snapshot))
        .catch(() => {});
    }

    return record;
  },

  updateThreadMessages: (id: string, messages: UIMessage[]) => {
    const { messages: normalizedMessages } = normalizeMessagesMetadata(messages);
    const existingRecord = get().records.get(id);
    const now = Date.now();

    const existingTimeline = get().timelines.get(id);
    const nextState = reconcileThreadMessageState(
      normalizedMessages,
      existingTimeline?.state
    );

    if (
      existingTimeline &&
      existingTimeline.state === nextState &&
      existingRecord &&
      existingRecord.messageSignature === nextState.signature
    ) {
      return; // No changes needed
    }

    const materializedMessages = materializeMessageState(nextState);

    const stored: StoredTimeline = {
      state: nextState,
      updatedAt: now,
      snapshot: {
        threadId: id,
        signature: nextState.signature,
        messages: materializedMessages,
        updatedAt: now,
      },
    };

    const baseRecord: Partial<ChatThreadRecord> & { id: string } = existingRecord
      ? existingRecord
      : {
          id,
          scopeKey: get().scopeKey,
          createdAt: now,
          messageCount: 0,
          messageSignature: "",
        };

    const record = createRecordFromState(
      baseRecord,
      stored,
      {
        createdAt: baseRecord.createdAt ?? now,
        updatedAt: now,
      }
    );

    set((prev) => ({
      records: withUpdatedRecord(prev, record),
      timelines: withUpdatedTimeline(prev, id, stored),
    }));

    const persistence = get().persistence;
    if (persistence) {
      persistence
        .saveRecord(record)
        .then(() => persistence.saveTimeline(stored.snapshot))
        .catch(() => {});
    }
  },

  renameThread: (id: string, title: string, opts?: { manual?: boolean; allowAutoReplace?: boolean }) => {
    const record = get().records.get(id);
    if (!record) return;
    const metadata = ensureMetadata(record.metadata);
    const isManualLock = metadata.manualTitle === true;
    if (!opts?.manual && isManualLock) return;
    if (!opts?.manual && record.title && metadata.autoTitled !== true && !opts?.allowAutoReplace) {
      return;
    }
    const nextMeta = { ...metadata };
    if (opts?.manual) {
      nextMeta.manualTitle = true;
      delete nextMeta.autoTitled;
    } else {
      nextMeta.autoTitled = true;
    }
    const updated: ChatThreadRecord = {
      ...record,
      title,
      metadata: nextMeta,
      updatedAt: Date.now(),
    };
    set((prev) => ({
      records: withUpdatedRecord(prev, updated),
    }));
    const persistence = get().persistence;
    if (persistence) {
      persistence.saveRecord(updated).catch(() => {});
    }
  },

  updateThreadMetadata: (id: string, patch: Record<string, unknown>) => {
    const record = get().records.get(id);
    if (!record) return;
    const metadata = ensureMetadata(record.metadata);
    const updated: ChatThreadRecord = {
      ...record,
      metadata: { ...metadata, ...patch },
    };
    set((prev) => ({
      records: withUpdatedRecord(prev, updated),
    }));
    const persistence = get().persistence;
    if (persistence) {
      persistence.saveRecord(updated).catch(() => {});
    }
  },

  deleteThread: async (id: string) => {
    const persistence = get().persistence;
    if (persistence) {
      try {
        await persistence.deleteThread(id);
      } catch {
        /* ignore */
      }
    }
    set((state) => {
      const nextRecords = new Map(state.records);
      nextRecords.delete(id);
      const nextTimelines = new Map(state.timelines);
      nextTimelines.delete(id);
      const next: Partial<ChatThreadsState> = {
        records: nextRecords,
        timelines: nextTimelines,
      };
      if (state.activeThreadId === id) {
        next.activeThreadId = undefined;
      }
      return next as ChatThreadsState;
    });

    const scope = get().scopeKey;
    const summaries = get()
      .listSummaries(scope)
      .filter((summary) => summary.id !== id);

    if (summaries.length === 0) {
      const record = get().createThread({ scopeKey: scope });
      set({ activeThreadId: record.id });
    } else if (!get().activeThreadId) {
      set({ activeThreadId: summaries[0]?.id });
    }
  },
}));
