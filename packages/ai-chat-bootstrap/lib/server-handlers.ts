import { convertToModelMessages, generateObject, streamText } from "ai";
import type { LanguageModel, ModelMessage } from "ai";
import { z } from "zod";
import type {
  ChatRequest,
  SuggestionsRequest,
  SuggestionsResponse,
} from "./types/chat";
import { SuggestionsSchema } from "./types/chat";
import {
  deserializeFrontendTools,
  loadMcpTools,
  type LoadMcpToolsResult,
} from "./utils/backend-tool-utils";
import type {
  MCPServerToolsRequest,
  MCPServerToolsResponse,
} from "./stores/mcp";
import type { UIMessage } from "ai";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

type StreamTextArgs = Parameters<typeof streamText>[0];
type StreamOptions = Partial<
  Omit<StreamTextArgs, "model" | "messages" | "tools">
>;

type GenerateObjectOptions = Record<string, unknown>;

type ModelResolver =
  | LanguageModel
  | ((ctx: {
      req: Request;
      body: ChatRequest;
    }) => Promise<LanguageModel> | LanguageModel);

export interface CreateAIChatHandlerOptions {
  model: ModelResolver;
  /**
   * Static `streamText` options (e.g. temperature) merged into the request.
   */
  streamOptions?: StreamOptions;
  /**
   * Optional hook to compute per-request `streamText` options.
   */
  buildStreamOptions?: (
    ctx: { req: Request; body: ChatRequest }
  ) => Promise<Partial<StreamOptions>> | Partial<StreamOptions>;
  onError?: (error: unknown, ctx: { req: Request; body?: ChatRequest }) => void;
}

export function createAIChatHandler(
  options: CreateAIChatHandlerOptions
): (req: Request) => Promise<Response> {
  const { model, streamOptions, buildStreamOptions, onError } = options;

  return async function aiChatHandler(req: Request): Promise<Response> {
    let body: ChatRequest | undefined;
    try {
      body = (await req.json()) as ChatRequest;
    } catch (error) {
      onError?.(error, { req });
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    try {
      const { messages, tools, enrichedSystemPrompt, mcpServers } = body;

      if (!enrichedSystemPrompt) {
        return new Response(
          JSON.stringify({ error: "Missing enrichedSystemPrompt" }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const frontendTools = deserializeFrontendTools(tools);
      const { tools: mcpTools } = await loadMcpTools(mcpServers);
      const combinedTools = { ...mcpTools, ...frontendTools };

      const modelMessages = convertToModelMessages(messages, {
        ignoreIncompleteToolCalls: true,
      }) as ModelMessage[];

      const messagesForModel: ModelMessage[] = [
        { role: "system" as const, content: enrichedSystemPrompt },
        ...modelMessages,
      ];

      const resolvedModel =
        typeof model === "function"
          ? await (model as (ctx: {
              req: Request;
              body: ChatRequest;
            }) => Promise<LanguageModel> | LanguageModel)({ req, body })
          : model;

      const dynamicOptions = buildStreamOptions
        ? await buildStreamOptions({ req, body })
        : undefined;

      const result = await streamText({
        model: resolvedModel,
        messages: messagesForModel,
        tools: combinedTools,
        ...(streamOptions ?? {}),
        ...(dynamicOptions ?? {}),
      });

      return result.toUIMessageStreamResponse();
    } catch (error) {
      onError?.(error, { req, body });
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }
  };
}

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

const DEFAULT_SUGGESTIONS_SYSTEM = "Generate contextual follow-up suggestions for the user.";

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
        error instanceof Error ? error.message : "Failed to generate suggestions";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }
  };
}

function extractTextFromMessages(sliceToSummarize: UIMessage[]): string {
  if (!sliceToSummarize.length) return "";
  const parts: string[] = [];
  for (const m of sliceToSummarize) {
    if (!m.parts) continue;
    for (const p of m.parts) {
      if (p.type === "text" && typeof p.text === "string") {
        parts.push(`${m.role}: ${p.text}`);
      }
    }
  }
  return parts.join("\n").trim();
}

function sanitizeTitle(raw: string): string {
  let title = raw.replace(/^\s*["'`]|["'`]\s*$/g, "");
  title = title.replace(/[\n\r]+/g, " ").replace(/\s+/g, " ").trim();
  if (title.length > 60) {
    title = title.slice(0, 60).replace(/\s+\S*$/, "");
  }
  return title || "Untitled thread";
}

function defaultFallbackTitle(messages: UIMessage[]): string | undefined {
  const firstUser = messages.find((m) => m.role === "user");
  const txt = firstUser ? extractTextFromMessages([firstUser]) : "";
  if (!txt) return undefined;
  const words = txt.replace(/\s+/g, " ").trim().split(" ");
  return sanitizeTitle(words.slice(0, 8).join(" "));
}

export interface CreateThreadTitleHandlerOptions {
  model?: LanguageModel;
  schema?: z.ZodType<{ thread_title: string }>;
  systemPrompt?: string;
  temperature?: number;
  fallback?: (
    messages: UIMessage[],
    previousTitle?: string
  ) => string | undefined | Promise<string | undefined>;
  generateOptions?: GenerateObjectOptions;
  buildGenerateOptions?: (
    ctx: { req: Request; messages: UIMessage[]; previousTitle?: string }
  ) => Promise<GenerateObjectOptions> | GenerateObjectOptions;
  onError?: (error: unknown, ctx: { req: Request }) => void;
}

const DEFAULT_THREAD_TITLE_SCHEMA = z.object({
  thread_title: z.string().min(1).max(120),
});

const DEFAULT_THREAD_TITLE_SYSTEM_PROMPT = `
You are an expert summarizer that creates concise chat thread titles (3-8 words).
Favor clarity over cleverness and avoid quotes or trailing punctuation.`.trim();

export function createThreadTitleHandler(
  options: CreateThreadTitleHandlerOptions = {}
): (req: Request) => Promise<Response> {
  const {
    model,
    schema = DEFAULT_THREAD_TITLE_SCHEMA,
    systemPrompt = DEFAULT_THREAD_TITLE_SYSTEM_PROMPT,
    temperature = 0.2,
    fallback = defaultFallbackTitle,
    generateOptions,
    buildGenerateOptions,
    onError,
  } = options;

  return async function threadTitleHandler(req: Request): Promise<Response> {
    let messages: UIMessage[] = [];
    let previousTitle: string | undefined;

    try {
      const body = (await req.json()) as {
        messages?: UIMessage[];
        previousTitle?: string;
      };
      messages = Array.isArray(body?.messages) ? body.messages : [];
      previousTitle =
        typeof body?.previousTitle === "string" ? body.previousTitle : undefined;
    } catch (error) {
      onError?.(error, { req });
      return new Response(JSON.stringify({ title: "Untitled thread" }), {
        headers: JSON_HEADERS,
        status: 400,
      });
    }

    const fallbackTitle = await fallback(messages, previousTitle);

    if (!model) {
      return new Response(
        JSON.stringify({ title: fallbackTitle ?? "Untitled thread" }),
        { headers: JSON_HEADERS }
      );
    }

    try {
      const excerpt = extractTextFromMessages(messages);
      const dynamicOptions = buildGenerateOptions
        ? await buildGenerateOptions({ req, messages, previousTitle })
        : undefined;

      const messagesForModel = [
        { role: "system" as const, content: systemPrompt },
        {
          role: "user" as const,
          content: `Previous title: ${previousTitle ?? "(none)"}\nExcerpt:\n${excerpt}`,
        },
      ] satisfies ModelMessage[];

      const result = await generateObject({
        model,
        schema,
        temperature,
        messages: messagesForModel,
        ...(generateOptions ?? {}),
        ...(dynamicOptions ?? {}),
      });

      const generatedTitle = (result.object as { thread_title?: string })
        ?.thread_title;
      const finalTitle = generatedTitle
        ? sanitizeTitle(generatedTitle)
        : fallbackTitle ?? "Untitled thread";

      return new Response(JSON.stringify({ title: finalTitle }), {
        headers: JSON_HEADERS,
      });
    } catch (error) {
      onError?.(error, { req });
      return new Response(
        JSON.stringify({ title: fallbackTitle ?? "Untitled thread" }),
        { headers: JSON_HEADERS }
      );
    }
  };
}

export interface CreateMcpToolsHandlerOptions {
  onError?: (error: unknown, ctx: { req: Request }) => void;
}

export function createMcpToolsHandler(
  options: CreateMcpToolsHandlerOptions = {}
): (req: Request) => Promise<Response> {
  const { onError } = options;

  return async function mcpToolsHandler(req: Request): Promise<Response> {
    let requestBody: MCPServerToolsRequest | undefined;
    try {
      requestBody = (await req.json()) as MCPServerToolsRequest;
    } catch (error) {
      onError?.(error, { req });
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    if (!requestBody?.server) {
      return new Response(
        JSON.stringify({ error: "Missing server descriptor" }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    try {
      const result: LoadMcpToolsResult = await loadMcpTools([requestBody.server]);
      const response: MCPServerToolsResponse = {
        tools: result.toolSummaries,
      };
      return new Response(JSON.stringify(response), {
        headers: JSON_HEADERS,
      });
    } catch (error) {
      onError?.(error, { req });
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load MCP tools";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }
  };
}
