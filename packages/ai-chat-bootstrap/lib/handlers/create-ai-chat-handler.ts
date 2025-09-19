import { convertToModelMessages, streamText } from "ai";
import type { LanguageModel, ModelMessage } from "ai";
import type { ChatRequest } from "../types/chat";
import { deserializeFrontendTools, loadMcpTools } from "../utils/backend-tool-utils";
import { JSON_HEADERS } from "./shared";

const STREAM_ERROR_MESSAGE = "Internal server error";

type StreamTextArgs = Parameters<typeof streamText>[0];
type StreamOptions = Partial<
  Omit<StreamTextArgs, "model" | "messages" | "tools">
>;

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
        error instanceof Error ? error.message : STREAM_ERROR_MESSAGE;
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: JSON_HEADERS,
      });
    }
  };
}
