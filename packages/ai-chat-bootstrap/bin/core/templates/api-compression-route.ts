import { openai } from "@ai-sdk/openai";
import { createCompressionHandler } from "ai-chat-bootstrap/server";

/**
 * Compression handler – invoked when the frontend exceeds its context threshold.
 * Provide a model resolver so the backend calls your summarisation model.
 * If the client omits `config.model`, respond with an error to avoid guessing.
 */
const handler = createCompressionHandler({
  model: ({ body }) => {
    const requestedModel = body.config?.model;
    if (!requestedModel) {
      return null; // triggers a 400 response so callers know to supply config.model
    }
    return openai(requestedModel);
  },
  generateOptions: { temperature: 0 },
  onError: (error) => {
    console.error("[compression-api]", error);
  },
});

export { handler as POST };
