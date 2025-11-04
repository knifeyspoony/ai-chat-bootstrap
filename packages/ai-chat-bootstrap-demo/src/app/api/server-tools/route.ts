import { createAzureClient } from "@/server/azure";
import { dynamicTool } from "@ai-sdk/provider-utils";
import { convertToModelMessages, streamText } from "ai";
import type { ChatRequest } from "ai-chat-bootstrap/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const azure = createAzureClient();
const FALLBACK_DEPLOYMENT = "gpt-4.1";

let serverCounter = 0;

const incrementCounterTool = dynamicTool({
  description:
    "Increment a shared server-side counter and report the updated value.",
  inputSchema: z.object({
    amount: z
      .number()
      .default(1)
      .describe(
        "Amount to increase the counter by. Defaults to 1 when omitted."
      ),
  }),
  execute: async (input) => {
    const amount = (input as { amount?: number }).amount;
    const delta =
      typeof amount === "number" && Number.isFinite(amount) ? amount : 1;
    serverCounter += delta;
    return {
      message: `Server counter increased by ${delta}. Current value: ${serverCounter}.`,
      newValue: serverCounter,
      delta,
    };
  },
});

export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch (error) {
    console.error("[server-tools-api] invalid request body", error);
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages, enrichedSystemPrompt, systemPrompt, model } = body;

  if (!messages || messages.length === 0) {
    return Response.json({ error: "Missing messages" }, { status: 400 });
  }

  const system =
    enrichedSystemPrompt ??
    systemPrompt ??
    "You are a helpful assistant controlling a server-side counter tool.";

  try {
    const result = await streamText({
      model: azure(model || FALLBACK_DEPLOYMENT),
      system,
      messages: convertToModelMessages(messages),
      tools: {
        increment_counter: incrementCounterTool,
      },
      toolChoice: { type: "tool", toolName: "increment_counter" },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[server-tools-api] failed to stream response", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
