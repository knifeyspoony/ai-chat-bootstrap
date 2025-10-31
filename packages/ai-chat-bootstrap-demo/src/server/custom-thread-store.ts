import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  ChatThreadRecord,
  ChatThreadTimeline,
} from "ai-chat-bootstrap/server";
import { normalizeMessagesMetadata } from "ai-chat-bootstrap/server";

type StoredThread = {
  record: ChatThreadRecord;
  timeline?: ChatThreadTimeline | null;
};

const DATA_DIR = path.join(
  process.cwd(),
  "packages",
  "ai-chat-bootstrap-demo",
  ".server-persistence"
);

const DATA_FILE = path.join(DATA_DIR, "threads.json");

let cache: Map<string, StoredThread> | null = null;

async function ensureLoaded(): Promise<void> {
  if (cache) return;
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoredThread[];
    cache = new Map(parsed.map((entry) => [entry.record.id, entry]));
  } catch (error) {
    cache = new Map();
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(
        "[custom-thread-store] failed to load persisted threads",
        error
      );
    }
  }
}

async function persist(): Promise<void> {
  if (!cache) return;
  const payload = JSON.stringify(Array.from(cache.values()), null, 2);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, payload, "utf8");
}

function normalizeRecord(record: ChatThreadRecord): ChatThreadRecord {
  return {
    ...record,
    metadata: record.metadata ? { ...record.metadata } : undefined,
  };
}

export async function listThreadSummaries(
  scopeKey?: string | null
): Promise<ChatThreadRecord[]> {
  await ensureLoaded();
  const entries = Array.from(cache!.values()).map((entry) => entry.record);
  return entries
    .filter((record) => (scopeKey ? record.scopeKey === scopeKey : true))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((record) => normalizeRecord(record));
}

export async function getThreadTimeline(
  threadId: string
): Promise<ChatThreadTimeline | null> {
  await ensureLoaded();
  const entry = cache!.get(threadId);
  if (!entry?.timeline) return null;
  return {
    ...entry.timeline,
    messages: entry.timeline.messages.map((msg) => ({ ...msg })),
  };
}

export async function upsertThreadRecord(
  record: ChatThreadRecord
): Promise<void> {
  await ensureLoaded();
  const existing = cache!.get(record.id);
  cache!.set(record.id, {
    record: normalizeRecord(record),
    timeline: existing?.timeline ?? null,
  });
  await persist();
}

export async function upsertThreadTimeline(
  timeline: ChatThreadTimeline
): Promise<void> {
  await ensureLoaded();
  const { messages } = normalizeMessagesMetadata(timeline.messages ?? []);
  const normalizedTimeline: ChatThreadTimeline = {
    ...timeline,
    messages,
  };

  const existing = cache!.get(timeline.threadId);
  if (existing) {
    cache!.set(timeline.threadId, {
      record: existing.record,
      timeline: normalizedTimeline,
    });
  } else {
    const now = Date.now();
    cache!.set(timeline.threadId, {
      record: {
        id: timeline.threadId,
        createdAt: now,
        updatedAt: now,
        messageCount: normalizedTimeline.messages.length,
        messageSignature: normalizedTimeline.signature,
        metadata: {},
      },
      timeline: normalizedTimeline,
    });
  }

  await persist();
}

export async function deleteThreadRecord(threadId: string): Promise<void> {
  await ensureLoaded();
  cache!.delete(threadId);
  await persist();
}
