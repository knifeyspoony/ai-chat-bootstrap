"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useEphemeralChatThreads } from "@/hooks/use-ephemeral-chat-threads";
import { ChatContainer } from "ai-chat-bootstrap";
import { Hammer, RefreshCw } from "lucide-react";
import { useCallback, useState } from "react";

const DEMO_MODELS = [{ id: "gpt-4.1", label: "GPT-4.1" }];

export default function ServerToolsDemo() {
  useEphemeralChatThreads();
  const [refreshCount, setRefreshCount] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshCount((value) => value + 1);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="flex h-full w-full max-w-sm flex-col gap-4 border-r border-border/60 bg-background p-6 shadow-sm lg:w-96">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-primary">
              <Hammer className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Server tools
              </span>
            </div>
            <CardTitle className="text-xl">Forced execution demo</CardTitle>
            <CardDescription>
              Every chat turn forces the backend to execute a server-owned tool
              before the assistant responds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              The API route registers a server-side{" "}
              <code>increment_counter</code> tool using the AI SDK helper
              directly. We force the LLM to call the tool by setting{" "}
              <code>toolChoice</code> on the streaming request.
            </p>
            <Separator />
            <ul className="list-disc space-y-2 pl-4">
              <li>
                Tool execution mutates a module-level counter on the server.
              </li>
              <li>
                The tool result streams back to the UI before the assistant
                message.
              </li>
              <li>
                Try prompting for different increments (e.g. &quot;add 5&quot;).
                We fall back to <code>+1</code> if the model omits an amount.
              </li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Inspect the API route
            </CardTitle>
            <CardDescription>
              Located at{" "}
              <code className="font-mono text-xs text-foreground">
                /api/server-tools
              </code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Reloading the page resets the in-memory counter. The button below
              clears the chat state without touching the server counter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset chat (counter persists)
            </Button>
          </CardContent>
        </Card>
      </aside>

      <main className="flex h-full flex-1 min-w-0 overflow-hidden">
        <ChatContainer
          key={refreshCount}
          transport={{ api: "/api/server-tools" }}
          messages={{
            systemPrompt:
              "You are a helpful assistant that must call the increment_counter tool every turn to keep a shared server counter accurate. Explain the latest counter value after executing the tool.",
          }}
          header={{
            title: "Server Tools Chat",
            subtitle:
              "The assistant calls the increment_counter tool before every response.",
            className: "px-6",
          }}
          models={{
            available: DEMO_MODELS,
            initial: "gpt-4.1",
          }}
          threads={{
            enabled: true,
            scopeKey: "server-tools-demo",
            autoCreate: true,
          }}
          ui={{
            className: "h-full w-full rounded-none border-0",
            placeholder: "Ask to adjust the counter…",
            classes: {
              messages: "px-6",
              inputWrapper: "px-6 pb-6",
            },
          }}
          devTools={{ enabled: true }}
        />
      </main>
    </div>
  );
}
