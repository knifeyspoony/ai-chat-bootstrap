"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UIMessage } from "ai";
import { ChatContainer, useChatThreadsStore } from "ai-chat-bootstrap";
import { Clock, Database, MessageSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

const DEMO_MODELS = [{ id: "gpt-4.1", label: "GPT-4.1" }];

export default function ThreadsDemo() {
  // Scope key for this demo - all threads created here will be in this scope
  const scopeKey = "threads-demo";

  // Defer store reads until after mount to avoid SSR hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Subscribe to thread store to show live status
  const {
    mode,
    persistence,
    activeThreadId,
    storeScopeKey,
    records,
    timelines,
  } = useChatThreadsStore(
    useShallow((state) => ({
      mode: state.mode,
      persistence: state.persistence,
      activeThreadId: state.activeThreadId,
      storeScopeKey: state.scopeKey,
      records: state.records,
      timelines: state.timelines,
    }))
  );

  const summaries = useMemo(() => {
    const key = scopeKey ?? storeScopeKey;
    const list = Array.from(records.values()).filter((record) =>
      key ? record.scopeKey === key : true
    );
    return list.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  }, [records, scopeKey, storeScopeKey]);

  const activeThread = useMemo(() => {
    if (!activeThreadId) return null;
    const record = records.get(activeThreadId);
    if (!record) return null;
    const storedTimeline = timelines.get(activeThreadId);
    const timeline = storedTimeline
      ? {
          threadId: activeThreadId,
          signature: storedTimeline.state.signature,
          messages: storedTimeline.state.order
            .map((id) => storedTimeline.state.byId.get(id))
            .filter((message): message is UIMessage => Boolean(message)),
          updatedAt: storedTimeline.updatedAt,
        }
      : undefined;

    return { record, timeline };
  }, [activeThreadId, records, timelines]);

  useEffect(() => {
    if (!activeThreadId) return;
    const store = useChatThreadsStore.getState();
    if (store.getTimeline(activeThreadId)) return;
    useChatThreadsStore
      .getState()
      .ensureTimeline(activeThreadId)
      .catch(() => {});
  }, [activeThreadId]);

  return (
    <div className="h-screen flex">
      {/* Sidebar with thread info */}
      <div className="w-80 border-r bg-muted/30 p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold mb-2">Persistent Threads Demo</h1>
            <p className="text-sm text-muted-foreground">
              Messages automatically save to IndexedDB. Try reloading the page!
            </p>
          </div>

          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Persistence Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mode:</span>
                <Badge
                  variant={mode === "persistent" ? "default" : "secondary"}
                >
                  {mounted ? mode : "..."}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">IndexedDB:</span>
                <Badge
                  variant={mounted && persistence ? "default" : "secondary"}
                >
                  {mounted ? (persistence ? "Active" : "Unavailable") : "..."}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Thread:</span>
                <span className="font-mono text-xs truncate max-w-[120px]">
                  {mounted && activeThreadId
                    ? activeThreadId.slice(0, 8)
                    : "None"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Active Thread Info */}
          {mounted && activeThread && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Current Thread
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {activeThread.record.title || "Untitled"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activeThread.timeline
                      ? activeThread.timeline.messages.length
                      : activeThread.record.messageCount}{" "}
                    message
                    {(activeThread.timeline
                      ? activeThread.timeline.messages.length
                      : activeThread.record.messageCount) !== 1
                      ? "s"
                      : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                  <Clock className="h-3 w-3" />
                  <span>
                    Updated:{" "}
                    {new Date(
                      activeThread.record.updatedAt
                    ).toLocaleTimeString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Thread List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                All Threads ({mounted ? summaries.length : 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!mounted ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : summaries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No threads yet. Send a message to create one!
                </p>
              ) : (
                <div className="space-y-2">
                  {summaries
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .slice(0, 5)
                    .map((meta) => (
                      <div
                        key={meta.id}
                        className={`text-xs p-2 rounded border ${
                          meta.id === activeThreadId
                            ? "bg-primary/10 border-primary"
                            : "bg-muted/50"
                        }`}
                      >
                        <div className="font-medium truncate">
                          {meta.title || "Untitled"}
                        </div>
                        <div className="text-muted-foreground mt-1">
                          {meta.messageCount} msgs • {meta.id.slice(0, 8)}
                        </div>
                      </div>
                    ))}
                  {summaries.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      +{summaries.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                How it Works
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-muted-foreground">
              <p>• Messages auto-save to IndexedDB</p>
              <p>
                • Click the threads button (top-right) to switch between
                conversations
              </p>
              <p>• Reload the page - your messages persist!</p>
              <p>• Threads are scoped to this demo page</p>
              <p className="pt-2 text-xs font-medium text-foreground">
                Check DevTools → Application → IndexedDB → acb_chat_threads
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1">
        <ChatContainer
          transport={{ api: "/api/chat" }}
          messages={{
            systemPrompt:
              "You are a helpful assistant demonstrating persistent thread functionality. When users ask about threads, explain how their conversation is being automatically saved to IndexedDB.",
          }}
          features={{
            chainOfThought: true,
            branching: true,
          }}
          models={{
            available: DEMO_MODELS,
            initial: DEMO_MODELS[0].id,
          }}
          threads={{
            enabled: true,
            scopeKey,
            autoCreate: true,
            title: {
              enabled: true,
              api: "/api/thread-title",
              sampleCount: 5,
            },
          }}
          header={{
            title: "Persistent Threads Chat",
            subtitle: "Your messages are automatically saved",
          }}
          ui={{
            placeholder:
              "Try: 'Explain how thread persistence works' or start a conversation...",
          }}
          suggestions={{
            enabled: true,
            count: 3,
          }}
          commands={{
            enabled: true,
          }}
        />
      </div>
    </div>
  );
}
