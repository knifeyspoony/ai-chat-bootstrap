import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText } from "ai";
import type { ChatRequest } from "ai-chat-bootstrap/server";
import { deserializeFrontendTools } from "ai-chat-bootstrap/server";

/**
 * Build a minimal SSE stream compatible with AI SDK UI message transport.
 * Emits a single assistant message then a done event.
 */
function buildMockStreamResponse(text: string) {
  const encoder = new TextEncoder();
  const id = `mock-${Date.now()}`;
  const stream = new ReadableStream({
    start(controller) {
      // Emit minimal valid UI message chunk sequence in streaming style.
      const interval = 55; // ms between chunks (tweak for UX)
      // Break text into small deltas: paragraph -> lines -> ~120 char slices
      const roughSegments = text
        .split(/\n\n+/)
        .flatMap((p) => p.split(/\n/))
        .flatMap((line) => {
          const parts: string[] = [];
          let remaining = line.trim();
          if (!remaining) return ["\n"]; // preserve blank lines
          while (remaining.length > 120) {
            const slice = remaining.slice(0, 120);
            parts.push(slice);
            remaining = remaining.slice(120);
          }
          if (remaining) parts.push(remaining);
          return parts;
        })
        .map((s) => s + "\n"); // add newline back for readability

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "start", messageId: id })}\n\n`
        )
      );
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "text-start", id: "text-1" })}\n\n`
        )
      );

      let i = 0;
      const pushNext = () => {
        if (i < roughSegments.length) {
          const deltaChunk = {
            type: "text-delta",
            id: "text-1",
            delta: roughSegments[i],
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(deltaChunk)}\n\n`)
          );
          i++;
          setTimeout(pushNext, interval);
        } else {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "text-end", id: "text-1" })}\n\n`
            )
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "finish" })}\n\n`)
          );
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      };
      pushNext();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "x-vercel-ai-ui-message-stream": "v1",
      "x-accel-buffering": "no",
    },
  });
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const { messages, tools, enrichedSystemPrompt }: ChatRequest =
    await req.json();

  if (!enrichedSystemPrompt) {
    return new Response(
      JSON.stringify({ error: "Missing enrichedSystemPrompt" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Fallback mock assistant when no API key is configured.
  if (!apiKey || apiKey === "your-key-here") {
    const docs = "https://knifeyspoony.github.io/ai-chat-bootstrap/";
    // Rotating guidance messages; last one repeats.
    const ROTATING_RESPONSES: string[] = [
      [
        "Looks like no **OpenAI API key** is configured yet! Add one to get real model responses.",
        "",
        "### Quick Setup",
        "",
        "~~~bash",
        "echo 'OPENAI_API_KEY=your-key-here' > .env.local",
        "npm run dev",
        "~~~",
        "",
        `Read the project docs: [AI Chat Bootstrap](${docs})`,
      ].join("\n"),
      [
        "Still Missing a Key? You can generate one in the OpenAI dashboard and put it in **.env.local**. Then, restart the server if it doesn't reload automatically.",
        "",
        "See [OpenAI Authentication](https://platform.openai.com/docs/api-reference/authentication)",
      ].join("\n"),
      [
        "Not an OpenAI user? Swap models or providers in `src/app/api/chat/route.ts`.",
        "",
        "Want Azure / Anthropic / local? Replace the client + model line.",
        "",
        "Check out the [AISDK Docs](https://ai-sdk.dev/docs/foundations/providers-and-models#ai-sdk-providers)",
      ].join("\n"),
      "You know this isn't an AI you're talking to, right? These are just canned responses.",

      "Thanks for checking out this project, though. Hopefully you get that key soon..",
      "Why do robots like pancakes? Because they're batter-y.",
      "Ok I don't have anything else for you. Good luck getting that API key..",
      "...",
      "...",
      "...",
      "...",
      "...",
      "Ok fine you can have mine, it's `jk123`",
      "Just kidding, I don't actually have one :(",
      "Goodbye!",
    ];

    // After we've already sent the final goodbye message, any further user
    // turns should surface an explicit error to signal the mock loop is over.
    const goodbyeIndex = ROTATING_RESPONSES.indexOf("Goodbye!");

    // Derive index from how many assistant messages already exist in the convo.
    // (Exclude tool messages etc. — keep it simple.)
    const assistantCount = (messages || []).filter(
      (m) => m.role === "assistant"
    ).length;
    if (goodbyeIndex !== -1 && assistantCount > goodbyeIndex) {
      return new Response(
        JSON.stringify({
          error:
            "Mock conversation ended. Configure OPENAI_API_KEY to continue.",
          action: "Add OPENAI_API_KEY to .env.local and restart dev server",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const idx =
      assistantCount < ROTATING_RESPONSES.length - 1
        ? assistantCount
        : ROTATING_RESPONSES.length - 1; // last one repeats until goodbye is reached
    const responseText = ROTATING_RESPONSES[idx];
    return buildMockStreamResponse(responseText);
  }

  const openai = createOpenAI({ apiKey });
  const model = openai("gpt-4o-mini");

  const deserializedTools = deserializeFrontendTools(tools);
  const modelMessages = convertToModelMessages(messages, {
    ignoreIncompleteToolCalls: true,
  });

  const result = await streamText({
    model,
    messages: [
      { role: "system", content: enrichedSystemPrompt },
      ...modelMessages,
    ],
    tools: deserializedTools,
    temperature: 0.7,
  });

  return result.toUIMessageStreamResponse();
}
