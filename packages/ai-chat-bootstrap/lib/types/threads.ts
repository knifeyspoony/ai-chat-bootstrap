import type { UIMessage } from "ai";

export interface ChatThread {
  id: string; // unique thread id
  parentId?: string; // optional parent for branching
  scopeKey?: string; // e.g. notebook id or app-specific partition key
  title?: string; // human readable title (auto inferred from first user message)
  messages: UIMessage[]; // full ordered message history
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms (updated on message append / rename)
  metadata?: Record<string, unknown>; // user extensible bag for model parameters etc.
}

// Lightweight descriptor ("slug") kept in memory for all threads in a scope without full messages
export interface ChatThreadMeta {
  id: string;
  parentId?: string;
  scopeKey?: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number; // number of messages (for UI / preview decisions)
}

export interface ChatThreadPersistence {
  loadAll(scopeKey?: string): Promise<ChatThread[]>;
  /** Optional optimized meta-only fetch. If absent, store will derive metas from full loadAll. */
  loadAllMeta?(scopeKey?: string): Promise<ChatThreadMeta[]>;
  save(thread: ChatThread): Promise<void>;
  delete(id: string): Promise<void>;
  bulkSave?(threads: ChatThread[]): Promise<void>;
  load?(id: string): Promise<ChatThread | null>; // already implied by store usage, formalize
}

export interface CreateThreadOptions {
  id?: string; // allow caller-supplied id
  parentId?: string;
  scopeKey?: string;
  title?: string;
  initialMessages?: UIMessage[];
  metadata?: Record<string, unknown>;
}

export interface CloneThreadOptions {
  newId?: string;
  parentId?: string; // override parent (defaults to source id)
  scopeKey?: string; // override scope
  titleSuffix?: string; // optional appended label e.g. "(branch)"
  trimLastAssistantIfStreaming?: boolean; // future: trim incomplete assistant msg
}
