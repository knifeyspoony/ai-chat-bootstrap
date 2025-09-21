import { createAIChatHandler } from "ai-chat-bootstrap/server";
import { openai } from "@ai-sdk/openai";

/**
 * Main chat handler – powered by ai-chat-bootstrap/server helper.
 * Swap the model or provider as needed for your project.
 */
const handler = createAIChatHandler({
  model: openai("gpt-4o-mini"),
  streamOptions: { temperature: 0.7 },
  onError: (error) => {
    console.error("[chat-api]", error);
  },
});

export { handler as POST };
