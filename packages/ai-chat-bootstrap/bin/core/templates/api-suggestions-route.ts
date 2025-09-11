import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import type {
  SuggestionsRequest,
  SuggestionsResponse,
} from "ai-chat-bootstrap/server";
import { SuggestionsSchema } from "ai-chat-bootstrap/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const { prompt }: SuggestionsRequest = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing enriched suggestions prompt" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fallback suggestions when no key is configured.
    if (!apiKey || apiKey === "your-key-here") {
      const docs = "https://knifeyspoony.github.io/ai-chat-bootstrap/";
      const response: SuggestionsResponse = {
        suggestions: [
          {
            reasoning: "User has no API key; guide setup",
            shortSuggestion: "Add API key",
            longSuggestion:
              "Set OPENAI_API_KEY in .env.local and restart the dev server.",
          },
          {
            reasoning: "Show where to read docs",
            shortSuggestion: "View docs",
            longSuggestion: `Read the setup guide: ${docs}`,
          },
          {
            reasoning: "Prompt user to retry after configuring",
            shortSuggestion: "Retry chat",
            longSuggestion:
              "After configuring your key, ask the assistant a question again.",
          },
        ],
      };
      return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const openai = createOpenAI({ apiKey });
    const model = openai("gpt-4o-mini");

    const result = await generateObject({
      model,
      schema: SuggestionsSchema,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Generate suggestions." },
      ],
      temperature: 0.8,
    });

    const response: SuggestionsResponse = {
      suggestions: result.object.suggestions,
    };
    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[suggestions-api] error", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate suggestions" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
