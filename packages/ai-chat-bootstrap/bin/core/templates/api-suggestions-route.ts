import { createSuggestionsHandler } from "ai-chat-bootstrap/server";
import { openai } from "@ai-sdk/openai";

/**
 * Suggestions handler using ai-chat-bootstrap/server helper.
 * Adjust schema or swap providers to match your needs.
 */
const handler = createSuggestionsHandler({
  model: openai("gpt-4o-mini"),
  onError: (error) => {
    console.error("[suggestions-api]", error);
  },
});

export { handler as POST };
