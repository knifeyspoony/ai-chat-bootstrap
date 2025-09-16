import { createAzure } from "@ai-sdk/azure";
import {
  createAIChatHandler,
  type ChatRequest,
} from "ai-chat-bootstrap/server";

// Configure Azure OpenAI (users will need to set these env vars)
const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME ?? "your-resource",
  apiKey: process.env.AZURE_API_KEY ?? "your-api-key",
  apiVersion: process.env.AZURE_API_VERSION ?? "preview",
});
const FALLBACK_DEPLOYMENT = "gpt-4.1";
const handler = createAIChatHandler({
  model: ({ body }) => {
    const requestedDeployment = body.model || FALLBACK_DEPLOYMENT;
    return azure(requestedDeployment);
  },
  streamOptions: { temperature: 0.7 },
  buildStreamOptions: ({ body }: { body: ChatRequest }) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[chat-api] enrichedSystemPrompt=${body.enrichedSystemPrompt}`
      );
    }
    return {};
  },
  onError: (error: unknown) => {
    console.error("Chat API error:", error);
  },
});

export async function POST(req: Request) {
  return await handler(req);
}
