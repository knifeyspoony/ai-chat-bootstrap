"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createServerThreadPersistence } from "@/lib/server-thread-persistence";
import type { ChatThreadRecord } from "ai-chat-bootstrap";
import {
  ChatContainer,
  useAIFrontendTool,
  useChatThreadsStore,
} from "ai-chat-bootstrap";
import {
  Database,
  DownloadCloud,
  Gauge,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useShallow } from "zustand/react/shallow";

const DEMO_MODELS = [
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4.1", label: "GPT-4.1" },
];

const SCOPE_KEY = "server-thread-demo";

export default function ServerPersistenceDemo() {
  const [adapter] = useState(() => createServerThreadPersistence());
  const [mounted, setMounted] = useState(false);
  const [serverSummaries, setServerSummaries] = useState<ChatThreadRecord[]>(
    []
  );
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const store = useChatThreadsStore.getState();
    store.initializePersistent(adapter);
    store.setScopeKey(SCOPE_KEY);
    store.loadSummaries(SCOPE_KEY).catch(() => {});

    return () => {
      useChatThreadsStore.getState().initializeEphemeral?.();
    };
  }, [adapter]);

  const refreshServerSummaries = useCallback(async () => {
    setIsLoadingSummaries(true);
    try {
      const response = await fetch(
        `/api/server-threads?scopeKey=${encodeURIComponent(SCOPE_KEY)}`,
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      const data = (await response.json()) as ChatThreadRecord[];
      setServerSummaries(data);
      await useChatThreadsStore
        .getState()
        .loadSummaries(SCOPE_KEY)
        .catch((error) => {
          console.error(
            "[server-thread-demo] failed to refresh client store summaries",
            error
          );
        });
    } catch (error) {
      console.error("[server-thread-demo] failed to load summaries", error);
    } finally {
      setIsLoadingSummaries(false);
    }
  }, []);

  useEffect(() => {
    void refreshServerSummaries();
  }, [refreshServerSummaries]);

  useAIFrontendTool({
    name: "increment_counter",
    description:
      "Increment the shared counter to demonstrate frontend tool execution in a server-persisted thread.",
    parameters: z.object({}),
    toolIcon: Gauge,
    execute: async () => {
      let nextValue = 0;
      setCounter((prev) => {
        nextValue = prev + 1;
        return nextValue;
      });
      return {
        message: `Counter increased to ${nextValue}`,
        newValue: nextValue,
      };
    },
  });

  const storeSnapshot = useChatThreadsStore(
    useShallow((state) => ({
      mode: state.mode,
      activeThreadId: state.activeThreadId,
      records: state.records,
      timelines: state.timelines,
      isSummariesLoaded: state.isSummariesLoaded,
    }))
  );

  const activeRecord = useMemo(() => {
    if (!storeSnapshot.activeThreadId) return null;
    return storeSnapshot.records.get(storeSnapshot.activeThreadId) ?? null;
  }, [storeSnapshot.activeThreadId, storeSnapshot.records]);

  return (
    <div className="h-screen flex">
      <aside className="w-96 border-r bg-muted/30 p-6 overflow-y-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Server Persistence</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Threads in this view are persisted via a Next.js route that writes
            to a server-side JSON store. Reload the page or open a new window to
            verify cross-session state.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Persistence Status
            </CardTitle>
            <CardDescription>
              Current thread scope: <code>{SCOPE_KEY}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Store Mode</span>
              <Badge variant="default">
                {mounted ? storeSnapshot.mode : "..."}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Active Thread</span>
              <span className="font-mono text-xs truncate max-w-[140px]">
                {mounted && storeSnapshot.activeThreadId
                  ? storeSnapshot.activeThreadId.slice(0, 8)
                  : "None"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Loaded Summaries</span>
              <Badge variant="secondary">
                {storeSnapshot.isSummariesLoaded
                  ? storeSnapshot.records.size
                  : "..."}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Server Store Snapshot
            </CardTitle>
            <CardDescription>
              Direct read from `/api/server-threads`.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Threads</span>
              <Badge variant="outline">{serverSummaries.length}</Badge>
            </div>
            <div className="space-y-2 text-xs">
              {serverSummaries.length === 0 ? (
                <p className="text-muted-foreground">No server records yet.</p>
              ) : (
                serverSummaries.slice(0, 5).map((record) => (
                  <div
                    key={record.id}
                    className="rounded border bg-background px-2 py-1"
                  >
                    <div className="font-medium truncate">
                      {record.title || "Untitled"}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2">
                      <span>{record.messageCount} msgs</span>
                      <span>•</span>
                      <span className="font-mono">{record.id.slice(0, 6)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={refreshServerSummaries}
              disabled={isLoadingSummaries}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              {isLoadingSummaries ? "Refreshing..." : "Refresh"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Tool Counter
            </CardTitle>
            <CardDescription>
              Updated automatically by the <code>increment_counter</code> tool.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current value</span>
              <span className="font-semibold">{counter}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ask the assistant to bump the counter—the tool result is saved
              with the active thread.
            </p>
          </CardContent>
        </Card>

        {activeRecord && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DownloadCloud className="h-4 w-4" />
                Active Thread Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Title</span>
                <span className="font-medium truncate">
                  {activeRecord.title || "Untitled"}
                </span>
                <span className="text-muted-foreground">Messages</span>
                <span>{activeRecord.messageCount}</span>
                <span className="text-muted-foreground">Updated</span>
                <span>
                  {new Date(activeRecord.updatedAt).toLocaleTimeString()}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </aside>

      <main className="flex-1 min-w-0">
        <ChatContainer
          messages={{
            systemPrompt:
              "You are demonstrating server-persisted threads with frontend tools. When the user wants to adjust the counter, call the increment_counter tool and report the updated value.",
          }}
          models={{ available: DEMO_MODELS }}
          threads={{
            enabled: true,
            scopeKey: SCOPE_KEY,
            warnOnMissing: true,
          }}
          commands={{ enabled: true }}
          devTools={{ showErrorMessages: true }}
        />
      </main>
    </div>
  );
}
