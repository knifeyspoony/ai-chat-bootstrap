import type { UIMessage } from "ai";
import type {
  ChatThreadPersistence,
  ChatThreadRecord,
  ChatThreadSummary,
  ChatThreadTimeline,
} from "../types/threads";

type StoredThread = ChatThreadRecord & {
  timelineMessages: unknown[];
  timelineUpdatedAt: number;
};

function promisifyRequest<T = unknown>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const DB_NAME = "acb_chat_threads";
const DB_VERSION = 2;
const STORE_NAME = "threads";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex("scopeKey", "scopeKey", { unique: false });
      store.createIndex("updatedAt", "updatedAt", { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function awaitTx(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    tx.onerror = () => reject(tx.error || new Error("Transaction error"));
  });
}

function toSummary(entry: StoredThread): ChatThreadSummary {
  return {
    id: entry.id,
    parentId: entry.parentId,
    scopeKey: entry.scopeKey,
    title: entry.title,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    messageCount: entry.messageCount,
    messageSignature: entry.messageSignature,
    metadata: entry.metadata,
  };
}

export function createIndexedDBChatThreadPersistence(): ChatThreadPersistence {
  return {
    async loadSummaries(scopeKey?: string): Promise<ChatThreadSummary[]> {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      let rows: StoredThread[] = [];
      if (scopeKey) {
        const index = store.index("scopeKey");
        rows = (await promisifyRequest(
          index.getAll(scopeKey)
        )) as StoredThread[];
      } else {
        rows = (await promisifyRequest(store.getAll())) as StoredThread[];
      }
      rows.sort((a, b) => b.updatedAt - a.updatedAt);
      return rows.map(toSummary);
    },

    async loadTimeline(threadId: string): Promise<ChatThreadTimeline | null> {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const entry = (await promisifyRequest(store.get(threadId))) as
        | StoredThread
        | undefined;
      if (!entry) return null;
      return {
        threadId,
        signature: entry.messageSignature,
        messages: Array.isArray(entry.timelineMessages)
          ? (entry.timelineMessages as UIMessage[])
          : [],
        updatedAt: entry.timelineUpdatedAt ?? entry.updatedAt,
      };
    },

    async saveRecord(record: ChatThreadRecord): Promise<void> {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const existing = (await promisifyRequest(
        store.get(record.id)
      )) as StoredThread | undefined;
      const next: StoredThread = {
        ...record,
        timelineMessages: existing?.timelineMessages ?? [],
        timelineUpdatedAt: existing?.timelineUpdatedAt ?? record.updatedAt,
      };
      store.put(next as unknown as Record<string, unknown>);
      await awaitTx(tx);
    },

    async saveTimeline(timeline: ChatThreadTimeline): Promise<void> {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const existing = (await promisifyRequest(
        store.get(timeline.threadId)
      )) as StoredThread | undefined;
      const base: StoredThread =
        existing ??
        ({
          id: timeline.threadId,
          createdAt: timeline.updatedAt,
          updatedAt: timeline.updatedAt,
          messageCount: timeline.messages.length,
          messageSignature: timeline.signature,
          metadata: {},
          timelineMessages: [],
          timelineUpdatedAt: timeline.updatedAt,
        } as StoredThread);
      const next: StoredThread = {
        ...base,
        messageCount: timeline.messages.length,
        messageSignature: timeline.signature,
        updatedAt: Math.max(base.updatedAt, timeline.updatedAt),
        timelineMessages: timeline.messages as unknown[],
        timelineUpdatedAt: timeline.updatedAt,
      };
      store.put(next as unknown as Record<string, unknown>);
      await awaitTx(tx);
    },

    async deleteThread(threadId: string): Promise<void> {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(threadId);
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
