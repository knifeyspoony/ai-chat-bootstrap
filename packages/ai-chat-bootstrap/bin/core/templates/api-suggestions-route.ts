import { createOpenAI } from "@ai-sdk/openai";
import {
  createSuggestionsHandler,
  type SuggestionsRequest,
  type SuggestionsResponse,
} from "ai-chat-bootstrap/server";

const apiKey = process.env.OPENAI_API_KEY;

const openai = apiKey && apiKey !== "your-key-here"
  ? createOpenAI({ apiKey })
  : null;

const model = openai ? openai("gpt-4o-mini") : null;

const runSuggestions = model
  ? createSuggestionsHandler({
      model,
      generateOptions: { temperature: 0.8 },
      onError: (error) => {
        console.error("[suggestions-api] error", error);
      },
    })
  : null;

export async function POST(req: Request) {
  const { prompt }: SuggestionsRequest = await req.json();

  if (!prompt) {
    return new Response(
      JSON.stringify({ error: "Missing enriched suggestions prompt" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!runSuggestions) {
    const docs = "https://knifeyspoony.github.io/ai-chat-bootstrap/";
    const fallback: SuggestionsResponse = {
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

    return new Response(JSON.stringify(fallback), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const handlerResponse = await runSuggestions(
    new Request(req.url, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    })
  );

  return handlerResponse;
}
