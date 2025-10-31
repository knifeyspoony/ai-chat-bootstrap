"use client";

import type {
  ChatThreadPersistence,
  ChatThreadRecord,
  ChatThreadTimeline,
} from "ai-chat-bootstrap";

const BASE_ENDPOINT = "/api/server-threads";

async function requestJSON<T>(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `[server-thread-persistence] request failed (${response.status}): ${body}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function createServerThreadPersistence(): ChatThreadPersistence {
  return {
    async loadSummaries(scopeKey) {
      const url = scopeKey
        ? `${BASE_ENDPOINT}?scopeKey=${encodeURIComponent(scopeKey)}`
        : BASE_ENDPOINT;
      return requestJSON<ChatThreadRecord[]>(url, { method: "GET" });
    },

    async loadTimeline(threadId) {
      const url = `${BASE_ENDPOINT}/${encodeURIComponent(
        threadId
      )}/timeline`;
      const timeline = await requestJSON<ChatThreadTimeline | null>(url, {
        method: "GET",
      });
      return timeline ?? null;
    },

    async saveRecord(record) {
      const url = `${BASE_ENDPOINT}/${encodeURIComponent(record.id)}`;
      await requestJSON<void>(url, {
        method: "PUT",
        body: JSON.stringify(sanitizeRecord(record)),
      });
    },

    async saveTimeline(timeline) {
      const url = `${BASE_ENDPOINT}/${encodeURIComponent(
        timeline.threadId
      )}/timeline`;
      await requestJSON<void>(url, {
        method: "PUT",
        body: JSON.stringify(sanitizeTimeline(timeline)),
      });
    },

    async deleteThread(threadId) {
      const url = `${BASE_ENDPOINT}/${encodeURIComponent(threadId)}`;
      await requestJSON<void>(url, {
        method: "DELETE",
      });
    },
  };
}

function sanitizeRecord(record: ChatThreadRecord): ChatThreadRecord {
  return {
    ...record,
    metadata: record.metadata ? { ...record.metadata } : undefined,
  };
}

function sanitizeTimeline(
  timeline: ChatThreadTimeline
): ChatThreadTimeline {
  return {
    ...timeline,
    messages: timeline.messages.map((message) => ({ ...message })),
  };
}
