"use client";

import { Switch } from "@/components/ui/switch";
import { useEphemeralChatThreads } from "@/hooks/use-ephemeral-chat-threads";
import type { ChatContainerProps } from "ai-chat-bootstrap";
import { ChatContainer } from "ai-chat-bootstrap";
import { useCallback, useMemo, useState } from "react";

type TransportPrepareCallback = NonNullable<
  NonNullable<ChatContainerProps["transport"]>["prepareSendMessagesRequest"]
>;

export default function TransportDemoPage() {
  useEphemeralChatThreads();

  const [signatureEnabled, setSignatureEnabled] = useState(true);
  const [signatureText, setSignatureText] = useState(
    "Sent via transport hook ✨"
  );
  const [lastPreparedBody, setLastPreparedBody] = useState<string | null>(null);

  const prepareSendMessagesRequest = useCallback<TransportPrepareCallback>(
    async (options) => {
      const originalBody =
        (options.body as Record<string, unknown> | undefined) ?? {};

      const existingMetadata =
        typeof (originalBody as { metadata?: unknown }).metadata === "object" &&
        (originalBody as { metadata?: Record<string, unknown> }).metadata !==
          null
          ? {
              ...((originalBody as { metadata?: Record<string, unknown> })
                .metadata as Record<string, unknown>),
            }
          : {};

      const messageCount = Array.isArray(
        (originalBody as { messages?: unknown }).messages
      )
        ? ((originalBody as { messages?: unknown[] }).messages ?? []).length
        : options.messages.length;

      const customBody = {
        ...originalBody,
        metadata: {
          ...existingMetadata,
          transportDemo: {
            signatureActive: signatureEnabled && signatureText.trim() !== "",
            signature: signatureText.trim(),
            messageCount,
            preparedAt: new Date().toISOString(),
          },
        },
      };

      setLastPreparedBody(JSON.stringify(customBody, null, 2));

      return {
        body: customBody,
      };
    },
    [signatureEnabled, signatureText]
  );

  const transportConfig = useMemo(
    () => ({
      api: "/api/chat",
      prepareSendMessagesRequest,
    }),
    [prepareSendMessagesRequest]
  );

  return (
    <div className="flex min-h-screen flex-col gap-6 p-6 lg:flex-row">
      <section className="flex w-full flex-col gap-4 rounded-xl border border-border/60 bg-muted/30 p-6 lg:max-w-sm">
        <header>
          <h1 className="text-xl font-semibold">
            Transport Customization Demo
          </h1>
          <p className="text-sm text-muted-foreground">
            Toggle request customization and inspect the payload that is sent to
            the API. The callback only enriches metadata so user messages remain
            unchanged.
          </p>
        </header>

        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background px-4 py-3">
          <div>
            <p className="text-sm font-medium">Attach signature metadata</p>
            <p className="text-xs text-muted-foreground">
              When enabled we append the text below to the outgoing request
              metadata.
            </p>
          </div>
          <Switch
            checked={signatureEnabled}
            onCheckedChange={setSignatureEnabled}
            aria-label="Toggle signature metadata"
          />
        </div>

        <label className="flex flex-col gap-2 rounded-lg border border-border/50 bg-background p-4">
          <span className="text-sm font-medium">Signature text</span>
          <input
            type="text"
            value={signatureText}
            onChange={(event) => setSignatureText(event.target.value)}
            className="flex-1 rounded-md border border-border/60 bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            placeholder="E.g. Sent from ACME Copilot"
          />
        </label>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Last prepared request</p>
          <pre className="max-h-80 overflow-auto rounded-lg border border-border/50 bg-background p-4 text-xs text-muted-foreground">
            {lastPreparedBody ?? "Send a message to inspect the payload…"}
          </pre>
        </div>
      </section>

      <main className="flex flex-1 flex-col">
        <ChatContainer
          transport={transportConfig}
          messages={{
            systemPrompt:
              "You are a helpful assistant. Acknowledge any signature metadata you receive.",
          }}
          threads={{ enabled: true, scopeKey: "transport-demo" }}
          header={{
            title: "Custom Transport Hook",
            subtitle: "Metadata is annotated before the request is sent",
            avatar: "/acb.png",
          }}
        />
      </main>
    </div>
  );
}
