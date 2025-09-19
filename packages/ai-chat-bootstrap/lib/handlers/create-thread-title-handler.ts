import { generateObject } from "ai";
import type { LanguageModel, ModelMessage, UIMessage } from "ai";
import { z } from "zod";
import type { GenerateObjectOptions } from "./shared";
import { JSON_HEADERS } from "./shared";

function extractTextFromMessages(sliceToSummarize: UIMessage[]): string {
  if (!sliceToSummarize.length) return "";
  const parts: string[] = [];
  for (const message of sliceToSummarize) {
    if (!message.parts) continue;
    for (const part of message.parts) {
      if (part.type === "text" && typeof part.text === "string") {
        parts.push(`${message.role}: ${part.text}`);
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
  const firstUser = messages.find((message) => message.role === "user");
  const text = firstUser ? extractTextFromMessages([firstUser]) : "";
  if (!text) return undefined;
  const words = text.replace(/\s+/g, " ").trim().split(" ");
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
