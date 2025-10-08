import { describe, it, expect, beforeEach } from 'vitest';
import { useChatThreadsStore } from '../lib/stores/chat-threads';
import type { ChatThread, ChatThreadPersistence } from '../lib/types/threads';

function resetStore() {
  useChatThreadsStore.getState().initializeEphemeral();
}

describe('useChatThreadsStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('creates thread and lists metas sorted by updatedAt desc', () => {
    const s = useChatThreadsStore.getState();
    const t1 = s.createThread({ title: 'A', scopeKey: 's1' });
    const t2 = s.createThread({ title: 'B', scopeKey: 's1' });
    // Force order by updating t1 later
    s.updateThreadMessages(t1.id, []);
    const metas = s.listThreads('s1');
    expect(metas[0].id).toBe(t1.id);
    expect(metas.map(m => m.messageCount)).toEqual([0, 0]);
    // Last created thread becomes active by default
    expect(useChatThreadsStore.getState().activeThreadId).toBe(t2.id);
    expect(s.getThreadIfLoaded(t2.id)?.title).toBe('B');
  });

  it('renames with manual lock and auto replace rules', () => {
    const s = useChatThreadsStore.getState();
    const t = s.createThread({ title: 'Auto 1' });
    // Auto rename allowed initially
    s.renameThread(t.id, 'Auto 2', { allowAutoReplace: true });
    expect(s.getThreadIfLoaded(t.id)?.title).toBe('Auto 2');
    // Manual rename sets lock
    s.renameThread(t.id, 'Manual', { manual: true });
    expect(s.getThreadIfLoaded(t.id)?.title).toBe('Manual');
    // Auto rename now skipped unless manual override
    s.renameThread(t.id, 'Auto 3');
    expect(s.getThreadIfLoaded(t.id)?.title).toBe('Manual');
  });

  it('deleteThread removes and selects another or creates new', async () => {
    const s = useChatThreadsStore.getState();
    const t1 = s.createThread({ title: 'One', scopeKey: 'A' });
    const t2 = s.createThread({ title: 'Two', scopeKey: 'A' });
    await s.deleteThread(t2.id);
    expect(useChatThreadsStore.getState().getThreadIfLoaded(t2.id)).toBeUndefined();
    expect(useChatThreadsStore.getState().activeThreadId).toBeDefined();
    await s.deleteThread(t1.id);
    // After deleting last, a new one is created in same scope and set active
    expect(useChatThreadsStore.getState().activeThreadId).toBeDefined();
  });

  it('loadThreadMetas uses persistence when provided and marks loaded', async () => {
    const calls: string[] = [];
    const mockPersistence: ChatThreadPersistence = {
      async loadAll(scopeKey?: string) {
        calls.push(`loadAll:${scopeKey ?? ''}`);
        return [];
      },
      async save() { /* no-op */ },
      async delete() { /* no-op */ },
    };
    const s = useChatThreadsStore.getState();
    s.setPersistence(mockPersistence);
    await s.loadThreadMetas('scopeX');
    expect(useChatThreadsStore.getState().isLoaded).toBe(true);
    expect(calls).toContain('loadAll:scopeX');
  });

  it('updateThreadMessages updates meta and persists when available', async () => {
    const saved: ChatThread[] = [];
    const mockPersistence: ChatThreadPersistence = {
      async loadAll() { return []; },
      async save(t) { saved.push(t); },
      async delete() {},
      async load() { return null; },
    };
    const s = useChatThreadsStore.getState();
    s.setPersistence(mockPersistence);
    const t = s.createThread({ title: 'X' });
    const before = s.listThreads()[0].updatedAt;
    s.updateThreadMessages(t.id, [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi'}] } as any]);
    const meta = s.listThreads()[0];
    expect(meta.messageCount).toBe(1);
    expect(meta.updatedAt).toBeGreaterThanOrEqual(before);
    expect(saved[saved.length - 1].messages.length).toBe(1);
  });

  it('initializeEphemeral disables persistence writes', () => {
    const saved: ChatThread[] = [];
    const mockPersistence: ChatThreadPersistence = {
      async loadAll() { return []; },
      async save(t) { saved.push(t); },
      async delete() {},
      async load() { return null; },
    };
    const store = useChatThreadsStore.getState();
    store.setPersistence(mockPersistence);
    expect(store.mode).toBe('persistent');

    store.initializeEphemeral();
    expect(useChatThreadsStore.getState().mode).toBe('ephemeral');
    const t = useChatThreadsStore.getState().createThread({ title: 'E' });
    useChatThreadsStore.getState().updateThreadMessages(t.id, []);
    expect(saved.length).toBe(0);
  });
});
