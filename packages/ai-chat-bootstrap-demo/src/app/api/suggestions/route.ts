import { createAzure } from "@ai-sdk/azure";
import { generateObject } from "ai";
import type {
  SuggestionsRequest,
  SuggestionsResponse,
} from "ai-chat-bootstrap/server";
import { SuggestionsSchema } from "ai-chat-bootstrap/server";

// Configure Azure OpenAI (users will need to set these env vars)
const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME ?? "your-resource",
  apiKey: process.env.AZURE_API_KEY ?? "your-api-key",
  apiVersion: process.env.AZURE_API_VERSION ?? "preview",
});

const model = azure(process.env.AZURE_DEPLOYMENT_ID ?? "gpt-4.1");

export async function POST(req: Request) {
  try {
    const { prompt }: SuggestionsRequest = await req.json();

    // Enforce that frontend provided enriched prompt (already contains context/focus/tools summary)
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing enriched suggestions prompt" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Optional lightweight log length only (avoid logging full prompt in prod)
    if (process.env.NODE_ENV !== "production") {
      console.log(`[chat-api] enrichedSystemPrompt length=${prompt.length}`);
      console.log(`[chat-api] enrichedSystemPrompt: ${prompt}`);
    }

    const result = await generateObject({
      model,
      schema: SuggestionsSchema,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Generate suggestions." },
      ],
      temperature: 0.8, // Slightly higher temperature for creative suggestions
    });

    const response: SuggestionsResponse = {
      suggestions: result.object.suggestions,
    };

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Suggestions API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate suggestions" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
