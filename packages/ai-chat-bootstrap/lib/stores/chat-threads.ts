import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { UIMessage } from "ai";
import type {
  ChatThread,
  ChatThreadMeta,
  ChatThreadPersistence,
  CreateThreadOptions,
} from "../types/threads";
import { getDefaultChatThreadPersistence } from "../persistence/chat-threads-indexeddb";

type ChatThreadsMode = "persistent" | "ephemeral";

interface ChatThreadsState {
  // Current scope partition key (optional)
  scopeKey?: string;

  // In-memory loaded full threads (messages present only for loaded ones)
  threads: Map<string, ChatThread>;

  // Meta cache for threads (id/title/timestamps/count), across scopes
  metas: Map<string, ChatThreadMeta>;

  // Active thread id for convenience in UI
  activeThreadId?: string;

  // Indicates metas are loaded for current scope
  isLoaded: boolean;

  // Persistence backend (default: IndexedDB if available)
  persistence?: ChatThreadPersistence;

  // Current persistence mode
  mode: ChatThreadsMode;

  // Actions
  initializePersistent: (persistence?: ChatThreadPersistence) => void;
  initializeEphemeral: () => void;
  setScopeKey: (scopeKey?: string) => void;
  setPersistence: (persistence?: ChatThreadPersistence) => void;
  setActiveThread: (id?: string) => void;

  listThreads: (scopeKey?: string) => ChatThreadMeta[];
  loadThreadMetas: (scopeKey?: string) => Promise<void>;
  loadThread: (id: string) => Promise<ChatThread | null>;
  getThreadIfLoaded: (id: string) => ChatThread | undefined;
  unloadThread: (id: string) => void;

  createThread: (opts?: CreateThreadOptions) => ChatThread;
  updateThreadMessages: (id: string, messages: UIMessage[]) => void;
  renameThread: (id: string, title: string, opts?: { manual?: boolean; allowAutoReplace?: boolean }) => void;
  deleteThread: (id: string) => Promise<void>;
  updateThreadMetadata: (id: string, patch: Record<string, unknown>) => void;
}

function toMeta(t: ChatThread): ChatThreadMeta {
  return {
    id: t.id,
    parentId: t.parentId,
    scopeKey: t.scopeKey,
    title: t.title,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    messageCount: t.messages?.length ?? 0,
  };
}

export const useChatThreadsStore = create<ChatThreadsState>((set, get) => ({
  scopeKey: undefined,
  threads: new Map<string, ChatThread>(),
  metas: new Map<string, ChatThreadMeta>(),
  activeThreadId: undefined,
  isLoaded: false,
  persistence: getDefaultChatThreadPersistence(),
  mode: "persistent",

  initializePersistent: (persistence?: ChatThreadPersistence) => {
    const nextPersistence = persistence ?? getDefaultChatThreadPersistence();
    set({
      scopeKey: undefined,
      threads: new Map<string, ChatThread>(),
      metas: new Map<string, ChatThreadMeta>(),
      activeThreadId: undefined,
      isLoaded: false,
      persistence: nextPersistence,
      mode: "persistent",
    });
  },

  initializeEphemeral: () => {
    set({
      scopeKey: undefined,
      threads: new Map<string, ChatThread>(),
      metas: new Map<string, ChatThreadMeta>(),
      activeThreadId: undefined,
      isLoaded: false,
      persistence: undefined,
      mode: "ephemeral",
    });
  },

  setScopeKey: (scopeKey?: string) => {
    const prev = get().scopeKey;
    if (prev === scopeKey) return;
    set({ scopeKey, isLoaded: false });
  },

  setPersistence: (persistence?: ChatThreadPersistence) =>
    set({
      persistence,
      mode: persistence ? "persistent" : "ephemeral",
    }),

  setActiveThread: (id?: string) => set({ activeThreadId: id }),

  listThreads: (scopeKey?: string) => {
    const key = scopeKey ?? get().scopeKey;
    const all = Array.from(get().metas.values());
    const filtered = key ? all.filter((m) => m.scopeKey === key) : all;
    // Sort by updatedAt desc
    filtered.sort((a, b) => b.updatedAt - a.updatedAt);
    return filtered;
  },

  loadThreadMetas: async (scopeKey?: string) => {
    const p = get().persistence;
    const key = scopeKey ?? get().scopeKey;
    if (!p) {
      // Nothing to load; mark loaded to avoid loops
      set({ isLoaded: true });
      return;
    }
    try {
      let metas: ChatThreadMeta[];
      if (p.loadAllMeta) {
        metas = await p.loadAllMeta(key);
      } else {
        const threads = await p.loadAll(key);
        metas = threads.map(toMeta);
      }
      set((state) => {
        const next = new Map(state.metas);
        for (const m of metas) next.set(m.id, m);
        return { metas: next, isLoaded: true };
      });
    } catch {
      set({ isLoaded: true });
    }
  },

  loadThread: async (id: string) => {
    // Already loaded
    const loaded = get().threads.get(id);
    if (loaded) return loaded;
    const p = get().persistence;
    if (!p) return null;
    try {
      const t = (await (p.load ? p.load(id) : null)) ?? null;
      if (!t) return null;
      set((state) => ({ threads: new Map(state.threads).set(id, t) }));
      // Ensure meta cache updated
      set((state) => ({ metas: new Map(state.metas).set(id, toMeta(t)) }));
      return t;
    } catch {
      return null;
    }
  },

  getThreadIfLoaded: (id: string) => get().threads.get(id),

  unloadThread: (id: string) => {
    set((state) => {
      const next = new Map(state.threads);
      next.delete(id);
      return { threads: next };
    });
  },

  createThread: (opts?: CreateThreadOptions): ChatThread => {
    const now = Date.now();
    const id = opts?.id ?? uuidv4();
    const scopeKey = opts?.scopeKey ?? get().scopeKey;
    const thread: ChatThread = {
      id,
      parentId: opts?.parentId,
      scopeKey,
      title: opts?.title,
      messages: opts?.initialMessages ?? [],
      createdAt: now,
      updatedAt: now,
      metadata: opts?.metadata,
    };

    set((state) => ({
      threads: new Map(state.threads).set(id, thread),
      metas: new Map(state.metas).set(id, toMeta(thread)),
    }));

    const p = get().persistence;
    if (p) {
      p.save(thread).catch(() => {});
    }
    // Select as active when created for convenience
    set({ activeThreadId: id });
    return thread;
  },

  updateThreadMessages: (id: string, messages: UIMessage[]) => {
    const existing = get().threads.get(id);
    const now = Date.now();
    if (!existing) {
      // If not loaded, try to update via meta: we need to load then save, or create a shell
      // Attempt lazy load then update in background
      const p = get().persistence;
      if (!p) return;
      p.load?.(id)
        .then((t) => {
          const thread: ChatThread = t
            ? { ...t, messages, updatedAt: now }
            : {
                id,
                messages,
                createdAt: now,
                updatedAt: now,
              } as unknown as ChatThread;
          set((state) => ({
            threads: new Map(state.threads).set(id, thread),
            metas: new Map(state.metas).set(id, toMeta(thread)),
          }));
          p.save(thread).catch(() => {});
        })
        .catch(() => {});
      return;
    }

    const updated: ChatThread = { ...existing, messages, updatedAt: now };
    set((state) => ({
      threads: new Map(state.threads).set(id, updated),
      metas: new Map(state.metas).set(id, toMeta(updated)),
    }));
    const p = get().persistence;
    if (p) p.save(updated).catch(() => {});
  },

  renameThread: (id: string, title: string, opts?: { manual?: boolean; allowAutoReplace?: boolean }) => {
    const now = Date.now();
    const loaded = get().threads.get(id);
    if (loaded) {
      const prevMeta = (loaded.metadata || {}) as Record<string, unknown>;
      const isManualLock = prevMeta.manualTitle === true;
      // If this is an auto rename and user previously set manual title, skip
      if (!opts?.manual && isManualLock) return;

      // If attempting auto rename and existing title wasn't auto-generated, only replace when allowed
      if (!opts?.manual && loaded.title && prevMeta.autoTitled !== true && !opts?.allowAutoReplace) {
        return;
      }

      const nextMeta: Record<string, unknown> = { ...prevMeta };
      if (opts?.manual) {
        nextMeta.manualTitle = true;
        delete nextMeta.autoTitled;
      } else {
        nextMeta.autoTitled = true;
      }

      const updated: ChatThread = {
        ...loaded,
        title,
        updatedAt: now,
        metadata: nextMeta,
      };
      set((state) => ({
        threads: new Map(state.threads).set(id, updated),
        metas: new Map(state.metas).set(id, toMeta(updated)),
      }));
      get().persistence?.save(updated).catch(() => {});
      return;
    }
    // Update meta only if not loaded
    set((state) => {
      const meta = state.metas.get(id);
      if (!meta) return {} as Partial<ChatThreadsState>;
      const updatedMeta: ChatThreadMeta = { ...meta, title, updatedAt: now };
      return { metas: new Map(state.metas).set(id, updatedMeta) };
    });
    // Try to patch persisted record without loading messages
    const p = get().persistence;
    if (p?.load) {
      p.load(id)
        .then((t) => {
          if (!t) return;
          const prevMeta = (t.metadata || {}) as Record<string, unknown>;
          const isManualLock = prevMeta.manualTitle === true;
          if (!opts?.manual && isManualLock) return;
          if (!opts?.manual && t.title && prevMeta.autoTitled !== true && !opts?.allowAutoReplace) return;
          const nextMeta: Record<string, unknown> = { ...prevMeta };
          if (opts?.manual) {
            nextMeta.manualTitle = true;
            delete nextMeta.autoTitled;
          } else {
            nextMeta.autoTitled = true;
          }
          const updated: ChatThread = { ...t, title, updatedAt: now, metadata: nextMeta };
          return p.save(updated);
        })
        .catch(() => {});
    }
  },

  deleteThread: async (id: string) => {
    const p = get().persistence;
    if (p) {
      try {
        await p.delete(id);
      } catch {
        /* ignore */
      }
    }
    const currentScope = get().scopeKey;
    set((state) => {
      const nextThreads = new Map(state.threads);
      nextThreads.delete(id);
      const nextMetas = new Map(state.metas);
      nextMetas.delete(id);
      const next: Partial<ChatThreadsState> = {
        threads: nextThreads,
        metas: nextMetas,
      };
      if (state.activeThreadId === id) next.activeThreadId = undefined;
      return next as ChatThreadsState;
    });

    // Ensure a valid active thread exists after deletion
    const metasInScope = Array.from(get().metas.values()).filter((m) =>
      currentScope ? m.scopeKey === currentScope : true
    );
    if (metasInScope.length === 0) {
      // Create a fresh thread for this scope and select it
      const t = get().createThread({ scopeKey: currentScope });
      set({ activeThreadId: t.id });
    } else {
      // Select the most recently updated remaining thread if none active
      const st = get();
      if (!st.activeThreadId) {
        const [latest] = metasInScope.sort((a, b) => b.updatedAt - a.updatedAt);
        if (latest) set({ activeThreadId: latest.id });
      }
    }
  },
  
  updateThreadMetadata: (id: string, patch: Record<string, unknown>) => {
    const existing = get().threads.get(id);
    if (existing) {
      const nextMeta = { ...(existing.metadata || {}), ...patch };
      const updated: ChatThread = { ...existing, metadata: nextMeta };
      set((state) => ({
        threads: new Map(state.threads).set(id, updated),
        // metas unchanged except possibly title/count/timestamps
      }));
      get().persistence?.save(updated).catch(() => {});
      return;
    }
    const p = get().persistence;
    if (p?.load) {
      p.load(id)
        .then((t) => {
          if (!t) return;
          const updated: ChatThread = { ...t, metadata: { ...(t.metadata || {}), ...patch } };
          set((state) => ({ threads: new Map(state.threads).set(id, updated) }));
          p.save(updated).catch(() => {});
        })
        .catch(() => {});
    }
  },
}));
