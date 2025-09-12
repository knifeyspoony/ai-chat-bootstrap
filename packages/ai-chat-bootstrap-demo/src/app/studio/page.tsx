"use client";

import { ChatPane } from "@/components/studio/ChatPane";
import { SourcesPanel } from "@/components/studio/SourcesPanel";
import { StudioLayout } from "@/components/studio/StudioLayout";
import { StudioPanel } from "@/components/studio/StudioPanel";
import { useStudioTools } from "@/hooks/use-studio-tools";
import { useNotesStore } from "@/stores/notes-store";
import { useSourcesStore } from "@/stores/sources-store";
import { useAIChat, useAIContext } from "ai-chat-bootstrap";
import { useMemo } from "react";

function ContextBridge() {
  const notesRecord = useNotesStore((s) => s.notes);
  const sourcesRecord = useSourcesStore((s) => s.sources);
  const userSources = useMemo(
    () =>
      Object.values(sourcesRecord).sort((a, b) => b.createdAt - a.createdAt),
    [sourcesRecord]
  );

  // Register context (memoized data objects -> stable identity when digest unchanged)
  const userSourcesMemo = useMemo(
    () => ({
      ...userSources.map((s) => ({ title: s.title, body: s.body })),
    }),
    [userSources]
  );
  useAIContext("Sources", userSourcesMemo);

  // Stable key only changes if a shared note's title or body changes or the set changes.
  const sharedNotesMemo = useMemo(() => {
    const all = Object.values(notesRecord);
    const items = all
      .filter((n) => n.sharedAsSource)
      .map((n) => ({ id: n.id, title: n.title, body: n.body }));
    const signature = items
      .map((i) => `${i.id}:${i.title}:${i.body}`)
      .join("|");
    return {
      signature,
      items: items.map(({ title, body }) => ({ title, body })),
    };
  }, [notesRecord]);
  useAIContext("Notes", sharedNotesMemo);

  // Project meta rarely changes; static memo
  const projectMeta = useMemo(() => ({ name: "Studio Demo", version: 1 }), []);
  useAIContext("projectMeta", projectMeta, {
    label: "Project Meta",
    priority: 2,
  });
  return null;
}

export default function StudioPage() {
  const chat = useAIChat({
    api: "/api/chat",
    systemPrompt:
      "You are an in‑app research assistant. Help the user investigate their topic using (a) provided source context, (b) current focus items, (c) available tools, and (d) the user's questions. Answer briefly—tight bullets or short paragraphs—avoiding filler. Prioritize information grounded in the supplied sources; cite source titles or shorthand identifiers when helpful. If something is unknown or not in sources, say so plainly. Suggest a tool call only when it clearly advances the research goal. Capture any durable, meaningful new finding or synthesis as a succinct note (prefix with 'Note:' when proposing it). Do not repeat prior answers unless adding new value. Never invent sources.",
  });

  // Register studio tools (notes CRUD) via dedicated hook
  useStudioTools();

  return (
    <>
      {/* ContextBridge should not occupy a visual panel; keep outside layout */}
      <ContextBridge />
      <StudioLayout>
        <SourcesPanel />
        <ChatPane chat={chat} />
        <StudioPanel />
      </StudioLayout>
    </>
  );
}
