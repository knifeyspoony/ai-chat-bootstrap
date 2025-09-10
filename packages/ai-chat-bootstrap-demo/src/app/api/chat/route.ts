import { createAzure } from "@ai-sdk/azure";
import { convertToModelMessages, streamText } from "ai";
import {
  type ChatRequest,
  deserializeFrontendTools,
} from "ai-chat-bootstrap/server";

// Configure Azure OpenAI (users will need to set these env vars)
const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME ?? "your-resource",
  apiKey: process.env.AZURE_API_KEY ?? "your-api-key",
  apiVersion: process.env.AZURE_API_VERSION ?? "preview",
});

const model = azure(process.env.AZURE_DEPLOYMENT_ID ?? "gpt-4.1");

export async function POST(req: Request) {
  try {
    const { messages, tools, enrichedSystemPrompt }: ChatRequest =
      await req.json();

    if (!enrichedSystemPrompt) {
      return new Response(
        JSON.stringify({ error: "Missing enrichedSystemPrompt in request" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const deserializedTools = deserializeFrontendTools(tools);

    // Optional lightweight log length only (avoid logging full prompt in prod)
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[chat-api] enrichedSystemPrompt length=${enrichedSystemPrompt.length}`
      );
      console.log(`[chat-api] enrichedSystemPrompt: ${enrichedSystemPrompt}`);
    }

    // Convert UI messages to model messages format
    const modelMessages = convertToModelMessages(messages, {
      ignoreIncompleteToolCalls: true,
    });

    const result = await streamText({
      model,
      messages: [
        { role: "system", content: enrichedSystemPrompt },
        ...modelMessages,
      ],
      tools: deserializedTools,
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
