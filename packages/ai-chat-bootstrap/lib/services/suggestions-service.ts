import type { Suggestion, SuggestionsRequest } from "../types/chat";
import { buildEnrichedSuggestionsPrompt } from "../utils/suggestions-utils";

export interface FetchSuggestionsOptions {
  signal?: AbortSignal;
  numSuggestions?: number; // default 3
  api?: string; // default /api/suggestions
}

export async function fetchSuggestionsService(
  request: SuggestionsRequest,
  options: FetchSuggestionsOptions = {}
): Promise<Suggestion[]> {
  const { signal, numSuggestions = 3, api = "/api/suggestions" } = options;

  const enrichedPrompt = buildEnrichedSuggestionsPrompt({
    originalSystemPrompt: request.prompt,
    context: request.context,
    focus: request.focus,
    tools: request.tools,
    numSuggestions,
  });

  const response = await fetch(api, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...request,
      prompt: enrichedPrompt,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch suggestions: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.suggestions as Suggestion[];
}
