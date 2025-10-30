import {
  createSuggestionsHandler,
  type SuggestionsRequest,
} from "ai-chat-bootstrap/server";
import { createAzureClient } from "@/server/azure";

// Configure Azure OpenAI (users will need to set these env vars)
const azure = createAzureClient();

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
