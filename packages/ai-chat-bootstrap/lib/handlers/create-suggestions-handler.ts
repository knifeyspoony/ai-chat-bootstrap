import { generateObject } from "ai";
import type { LanguageModel, ModelMessage } from "ai";
import { z } from "zod";
import type {
  SuggestionsRequest,
  SuggestionsResponse,
} from "../types/chat";
import { SuggestionsSchema } from "../types/chat";
import type { GenerateObjectOptions } from "./shared";
import { JSON_HEADERS } from "./shared";

export interface CreateSuggestionsHandlerOptions {
  model: LanguageModel;
  schema?: z.ZodTypeAny;
  systemMessage?: string;
  userPrompt?: string;
  generateOptions?: GenerateObjectOptions;
  buildGenerateOptions?: (
    ctx: { req: Request; body: SuggestionsRequest }
  ) => Promise<GenerateObjectOptions> | GenerateObjectOptions;
  onError?: (error: unknown, ctx: { req: Request; body?: SuggestionsRequest }) => void;
}

const DEFAULT_SUGGESTIONS_SYSTEM =
  "Generate contextual follow-up suggestions for the user.";

export function createSuggestionsHandler(
  options: CreateSuggestionsHandlerOptions
): (req: Request) => Promise<Response> {
  const {
    model,
    schema = SuggestionsSchema,
    systemMessage = DEFAULT_SUGGESTIONS_SYSTEM,
    userPrompt = "Generate suggestions.",
    generateOptions,
    buildGenerateOptions,
    onError,
  } = options;

  return async function suggestionsHandler(req: Request): Promise<Response> {
    let body: SuggestionsRequest | undefined;
    try {
      body = (await req.json()) as SuggestionsRequest;
    } catch (error) {
      onError?.(error, { req });
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    try {
      if (!body?.prompt) {
        return new Response(
          JSON.stringify({ error: "Missing enriched suggestions prompt" }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const dynamicOptions = buildGenerateOptions
        ? await buildGenerateOptions({ req, body })
        : undefined;

      const systemMessages = [systemMessage, body.prompt].filter(
        (value): value is string => typeof value === "string" && value.length > 0
      );

      const messagesForModel = [
        ...systemMessages.map((content) => ({
          role: "system" as const,
          content,
        })),
        { role: "user" as const, content: userPrompt },
      ] satisfies ModelMessage[];

      const result = await generateObject({
        model,
        schema,
        messages: messagesForModel,
        ...(generateOptions ?? {}),
        ...(dynamicOptions ?? {}),
      });

      const suggestionsData = (result.object as {
        suggestions?: SuggestionsResponse["suggestions"];
      })?.suggestions;

      const response: SuggestionsResponse = {
        suggestions: suggestionsData ?? [],
      };
      return new Response(JSON.stringify(response), {
        headers: JSON_HEADERS,
      });
    } catch (error) {
      onError?.(error, { req, body });
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate suggestions";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }
  };
}
