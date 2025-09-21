import { createThreadTitleHandler } from "ai-chat-bootstrap/server";
import { openai } from "@ai-sdk/openai";

/**
 * Generates concise titles for persisted chat threads.
 * Customize the model or handler options to match your needs.
 */
const handler = createThreadTitleHandler({
  model: openai("gpt-4o-mini"),
  onError: (error) => {
    console.error("[thread-title-api]", error);
  },
});

export { handler as POST };
