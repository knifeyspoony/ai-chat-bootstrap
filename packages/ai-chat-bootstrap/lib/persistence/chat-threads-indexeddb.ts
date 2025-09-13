import type {
  ChatThread,
  ChatThreadMeta,
  ChatThreadPersistence,
} from "../types/threads";

// Small promisified helpers around IndexedDB API
function promisifyRequest<T = unknown>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const DB_NAME = "acb_chat_threads";
const DB_VERSION = 1;
const STORE_NAME = "threads";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB not available"));
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("scopeKey", "scopeKey", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
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

function awaitTx(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    tx.onerror = () => reject(tx.error || new Error("Transaction error"));
  });
}

export function createIndexedDBChatThreadPersistence(): ChatThreadPersistence {
  return {
    async loadAll(scopeKey?: string): Promise<ChatThread[]> {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      let result: ChatThread[] = [];
      if (scopeKey) {
        const index = store.index("scopeKey");
        result = (await promisifyRequest(index.getAll(scopeKey))) as ChatThread[];
      } else {
        result = (await promisifyRequest(store.getAll())) as ChatThread[];
      }
      // Sort by updatedAt desc for consistency
      result.sort((a, b) => b.updatedAt - a.updatedAt);
      return result;
    },

    async loadAllMeta(scopeKey?: string): Promise<ChatThreadMeta[]> {
      const all = await this.loadAll(scopeKey);
      return all.map(toMeta);
    },

    async save(thread: ChatThread): Promise<void> {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(thread as unknown as Record<string, unknown>);
      await awaitTx(tx);
    },

    async bulkSave(threads: ChatThread[]): Promise<void> {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      for (const t of threads) {
        store.put(t as unknown as Record<string, unknown>);
      }
      await awaitTx(tx);
    },

    async load(id: string): Promise<ChatThread | null> {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const res = (await promisifyRequest(store.get(id))) as ChatThread | undefined;
      return res ?? null;
    },

    async delete(id: string): Promise<void> {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      await awaitTx(tx);
    },
  };
}

export function getDefaultChatThreadPersistence(): ChatThreadPersistence | undefined {
  try {
    if (typeof window !== "undefined" && typeof indexedDB !== "undefined") {
      return createIndexedDBChatThreadPersistence();
    }
    return undefined;
  } catch {
    return undefined;
  }
}
