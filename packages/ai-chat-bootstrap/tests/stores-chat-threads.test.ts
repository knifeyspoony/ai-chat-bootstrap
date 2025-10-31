import type { UIMessage } from 'ai';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatThreadsStore } from '../lib/stores/chat-threads';
import type {
  ChatThreadPersistence,
  ChatThreadRecord,
  ChatThreadTimeline,
} from '../lib/types/threads';

function resetStore() {
  useChatThreadsStore.getState().initializePersistent();
}

describe('useChatThreadsStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('creates threads and lists summaries sorted by updatedAt desc', () => {
    const store = useChatThreadsStore.getState();
    const a = store.createThread({ title: 'A', scopeKey: 's1' });
    const b = store.createThread({ title: 'B', scopeKey: 's1' });
    store.updateThreadMessages(a.id, [
      { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hello' }] } as unknown as UIMessage,
    ]);
    const summaries = store.listSummaries('s1');
    expect(summaries[0]?.id).toBe(a.id);
    expect(summaries.map((s) => s.messageCount)).toEqual([1, 0]);
    expect(useChatThreadsStore.getState().activeThreadId).toBe(b.id);
    expect(store.getRecord(b.id)?.title).toBe('B');
  });

  it('renames with manual lock and auto replace rules', () => {
    const store = useChatThreadsStore.getState();
    const record = store.createThread({ title: 'Auto 1' });
    store.renameThread(record.id, 'Auto 2', { allowAutoReplace: true });
    expect(store.getRecord(record.id)?.title).toBe('Auto 2');
    store.renameThread(record.id, 'Manual', { manual: true });
    expect(store.getRecord(record.id)?.title).toBe('Manual');
    store.renameThread(record.id, 'Auto 3');
    expect(store.getRecord(record.id)?.title).toBe('Manual');
  });

  it('deleteThread removes and selects another or creates new', async () => {
    const store = useChatThreadsStore.getState();
    const one = store.createThread({ title: 'One', scopeKey: 'A' });
    const two = store.createThread({ title: 'Two', scopeKey: 'A' });
    await store.deleteThread(two.id);
    expect(useChatThreadsStore.getState().getRecord(two.id)).toBeUndefined();
    expect(useChatThreadsStore.getState().activeThreadId).toBeDefined();
    await store.deleteThread(one.id);
    expect(useChatThreadsStore.getState().activeThreadId).toBeDefined();
  });

  it('loadSummaries uses persistence when provided and marks loaded', async () => {
    const calls: string[] = [];
    const mockPersistence: ChatThreadPersistence = {
      async loadSummaries(scopeKey?: string) {
        calls.push(`loadSummaries:${scopeKey ?? ''}`);
        return [];
      },
      async loadTimeline() {
        return null;
      },
      async saveRecord() {
        /* no-op */
      },
      async saveTimeline() {
        /* no-op */
      },
      async deleteThread() {
        /* no-op */
      },
    };
    const store = useChatThreadsStore.getState();
    store.setPersistence(mockPersistence);
    await store.loadSummaries('scopeX');
    expect(useChatThreadsStore.getState().isSummariesLoaded).toBe(true);
    expect(calls).toContain('loadSummaries:scopeX');
  });

  it('updateThreadMessages updates meta and persists when available', async () => {
    const savedRecords: ChatThreadRecord[] = [];
    const savedTimelines: ChatThreadTimeline[] = [];
    const mockPersistence: ChatThreadPersistence = {
      async loadSummaries() {
        return [];
      },
      async loadTimeline() {
        return null;
      },
      async saveRecord(record) {
        savedRecords.push(record);
      },
      async saveTimeline(timeline) {
        savedTimelines.push(timeline);
      },
      async deleteThread() {
        /* no-op */
      },
    };
    const store = useChatThreadsStore.getState();
    store.setPersistence(mockPersistence);
    const record = store.createThread({ title: 'X' });
    const before = store.listSummaries()[0].updatedAt;
    store.updateThreadMessages(record.id, [
      {
        id: 'm1',
        role: 'user',
        parts: [{ type: 'text', text: 'hi' }],
      } as unknown as UIMessage,
    ]);
    await Promise.resolve();
    const summary = store.listSummaries()[0];
    expect(summary.messageCount).toBe(1);
    expect(summary.updatedAt).toBeGreaterThanOrEqual(before);
    expect(savedRecords.at(-1)?.messageCount).toBe(1);
    expect(savedTimelines.at(-1)?.messages.length).toBe(1);
  });

  it('initializeEphemeral disables persistence writes', () => {
    const savedRecords: ChatThreadRecord[] = [];
    const mockPersistence: ChatThreadPersistence = {
      async loadSummaries() {
        return [];
      },
      async loadTimeline() {
        return null;
      },
      async saveRecord(record) {
        savedRecords.push(record);
      },
      async saveTimeline() {
        /* no-op */
      },
      async deleteThread() {
        /* no-op */
      },
    };
    const store = useChatThreadsStore.getState();
    store.setPersistence(mockPersistence);
    expect(useChatThreadsStore.getState().mode).toBe('persistent');

    store.initializeEphemeral();
    expect(useChatThreadsStore.getState().mode).toBe('ephemeral');
    const t = useChatThreadsStore.getState().createThread({ title: 'E' });
    useChatThreadsStore.getState().updateThreadMessages(t.id, []);
    expect(savedRecords.length).toBe(0);
  });

  it('loadSummaries removes stale records and hydrates fallback timeline', async () => {
    const store = useChatThreadsStore.getState();

    const stale = store.createThread({ id: 'stale', scopeKey: 'scopeA', title: 'Old' });
    store.setActiveThread(stale.id);
    store.updateThreadMessages(stale.id, [
      {
        id: 'stale-msg',
        role: 'user',
        parts: [{ type: 'text', text: 'legacy' }],
      } as unknown as UIMessage,
    ]);

    const loadSummaries = vi.fn(async () => [
      {
        id: 'fresh',
        scopeKey: 'scopeA',
        title: 'Fresh',
        createdAt: Date.now() - 10,
        updatedAt: Date.now(),
        messageCount: 2,
        messageSignature: 'sig-new',
        metadata: {},
        parentId: undefined,
      } satisfies ChatThreadRecord,
    ]);

    const loadTimeline = vi.fn(async () => ({
      threadId: 'fresh',
      signature: 'sig-new',
      updatedAt: Date.now(),
      messages: [
        {
          id: 'a',
          role: 'assistant',
          parts: [{ type: 'text', text: 'latest' }],
        } as unknown as UIMessage,
      ],
    } satisfies ChatThreadTimeline));

    const mockPersistence: ChatThreadPersistence = {
      loadSummaries,
      loadTimeline,
      async saveRecord() {
        /* no-op */
      },
      async saveTimeline() {
        /* no-op */
      },
      async deleteThread() {
        /* no-op */
      },
    };

    store.setScopeKey('scopeA');
    store.setPersistence(mockPersistence);

    await store.loadSummaries('scopeA');
    await Promise.resolve();

    const nextState = useChatThreadsStore.getState();
    expect(loadSummaries).toHaveBeenCalledTimes(1);
    expect(loadTimeline).toHaveBeenCalledWith('fresh');
    expect(nextState.records.has('stale')).toBe(false);
    expect(nextState.timelines.has('stale')).toBe(false);
    expect(nextState.activeThreadId).toBe('fresh');
    expect(nextState.timelines.get('fresh')?.snapshot.messages[0]?.id).toBe('a');
  });
});
