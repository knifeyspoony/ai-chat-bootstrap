import type { UIMessage } from "ai";

/**
 * Thread metadata persisted separately from message payloads. This record contains
 * everything needed to render thread lists, select active threads, and reason about
 * message timelines without having to load the full history.
 */
export interface ChatThreadRecord {
  id: string;
  parentId?: string;
  scopeKey?: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  messageSignature: string;
  metadata?: Record<string, unknown>;
}

/**
 * Lightweight descriptor returned from list operations. Alias kept for readability
 * in call sites and UI components.
 */
export type ChatThreadSummary = ChatThreadRecord;

/**
 * Snapshot of the ordered message history for a thread.
 */
export interface ChatThreadTimeline {
  threadId: string;
  signature: string;
  messages: UIMessage[];
  updatedAt: number;
}

/**
 * Combined view returned by selectors when both record and timeline are loaded.
 */
export interface ChatThread {
  record: ChatThreadRecord;
  timeline?: ChatThreadTimeline;
}

export interface ChatThreadPersistence {
  /**
   * Load thread summaries for the provided scope. Implementers must return summaries
   * sorted by descending updatedAt to match UI expectations.
   */
  loadSummaries(scopeKey?: string): Promise<ChatThreadSummary[]>;
  /**
   * Load the timeline for a given thread. When null is returned the caller should
   * treat the thread as missing and may decide to delete it locally.
   */
  loadTimeline(threadId: string): Promise<ChatThreadTimeline | null>;
  /**
   * Persist thread metadata. This should be lightweight and must complete before the
   * corresponding timeline is saved to ensure data consistency in multi-tab setups.
   */
  saveRecord(record: ChatThreadRecord): Promise<void>;
  /**
   * Persist the message timeline for a thread. Implementers may choose to store both
   * record and timeline together, but both methods must still resolve successfully.
   */
  saveTimeline(timeline: ChatThreadTimeline): Promise<void>;
  /**
   * Delete a thread and all associated data.
   */
  deleteThread(threadId: string): Promise<void>;
}

export interface CreateThreadOptions {
  id?: string;
  parentId?: string;
  scopeKey?: string;
  title?: string;
  initialMessages?: UIMessage[];
  metadata?: Record<string, unknown>;
}

export interface CloneThreadOptions {
  newId?: string;
  parentId?: string;
  scopeKey?: string;
  titleSuffix?: string;
  trimLastAssistantIfStreaming?: boolean;
}
