import { createAzure } from "@ai-sdk/azure";
import {
  createSuggestionsHandler,
  type SuggestionsRequest,
} from "ai-chat-bootstrap/server";

// Configure Azure OpenAI (users will need to set these env vars)
const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME ?? "your-resource",
  apiKey: process.env.AZURE_API_KEY ?? "your-api-key",
  apiVersion: process.env.AZURE_API_VERSION ?? "preview",
});

const model = azure(process.env.AZURE_DEPLOYMENT_ID ?? "gpt-4.1");

export const POST = createSuggestionsHandler({
  model,
  generateOptions: { temperature: 0.8 },
  buildGenerateOptions: ({ body }: { body: SuggestionsRequest }) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[suggestions-api] prompt length=${body.prompt?.length ?? 0}`);
    }
    return {};
  },
  onError: (error: unknown) => {
    console.error("Suggestions API error:", error);
  },
});
