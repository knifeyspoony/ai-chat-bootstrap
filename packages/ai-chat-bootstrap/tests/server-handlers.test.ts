import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatRequest, SuggestionsRequest } from "../lib/types/chat";
import type { UIMessage } from "ai";

vi.mock("ai", () => ({
  convertToModelMessages: vi.fn(),
  streamText: vi.fn(),
  generateObject: vi.fn(),
  tool: vi.fn((config: unknown) => ({
    __mockTool: true,
    ...(typeof config === "object" && config ? config : {}),
  })),
}));

const loadMcpToolsMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/utils/backend-tool-utils", async () => {
  const actual = await vi.importActual<any>("../lib/utils/backend-tool-utils");
  return {
    ...actual,
    loadMcpTools: loadMcpToolsMock,
  };
});

import {
  createAIChatHandler,
  createSuggestionsHandler,
  createThreadTitleHandler,
  createMcpToolsHandler,
} from "../lib/handlers";
import {
  convertToModelMessages,
  streamText,
  generateObject,
} from "ai";

afterEach(() => {
  vi.clearAllMocks();
  loadMcpToolsMock.mockReset();
});

describe("createAIChatHandler", () => {
  it("streams chat responses and merges frontend + MCP tools", async () => {
    (convertToModelMessages as unknown as vi.Mock).mockReturnValue([
      { role: "user", content: "hello" },
    ]);
    const streamResponse = {
      toUIMessageStreamResponse: vi.fn(() => new Response("stream")),
    };
    (streamText as unknown as vi.Mock).mockResolvedValue(streamResponse);
    loadMcpToolsMock.mockResolvedValue({
      tools: { remote: { description: "remote" } },
      toolSummaries: [{ name: "remote", description: "remote" }],
    });

    const handler = createAIChatHandler({
      model: "test-model",
    });

    const requestBody: ChatRequest = {
      messages: [],
      tools: [
        {
          name: "local",
          description: "desc",
          inputSchema: { type: "object" },
        } as any,
      ],
      enrichedSystemPrompt: "system",
    };

    const response = await handler(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })
    );

    const bodyText = await response.text();

    expect(response.status).toBe(200);

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        tools: expect.objectContaining({
          remote: expect.anything(),
          local: expect.anything(),
        }),
      })
    );
    expect(bodyText).toBe("stream");
  });

  it("allows resolving model per request", async () => {
    (convertToModelMessages as unknown as vi.Mock).mockReturnValue([
      { role: "user", content: "hello" },
    ]);
    const streamResponse = {
      toUIMessageStreamResponse: vi.fn(() => new Response("dynamic")),
    };
    (streamText as unknown as vi.Mock).mockResolvedValue(streamResponse);
    loadMcpToolsMock.mockResolvedValue({ tools: {}, toolSummaries: [] });

    const handler = createAIChatHandler({
      model: ({ body }: { body: ChatRequest }) => `model-${body.model ?? "default"}`,
    });

    const requestBody: ChatRequest = {
      messages: [],
      enrichedSystemPrompt: "system",
      model: "selected",
    };

    const response = await handler(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })
    );

    expect(response.status).toBe(200);
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({ model: "model-selected" })
    );
  });

  it("returns 400 when enrichedSystemPrompt missing", async () => {
    const handler = createAIChatHandler({ model: "test" });
    const res = await handler(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      })
    );
    expect(res.status).toBe(400);
    expect(streamText).not.toHaveBeenCalled();
  });
});

describe("createSuggestionsHandler", () => {
  it("generates suggestions when prompt provided", async () => {
    (generateObject as unknown as vi.Mock).mockResolvedValue({
      object: { suggestions: [{ shortSuggestion: "hi" }] },
    });

    const handler = createSuggestionsHandler({
      model: "test",
      generateOptions: { temperature: 0.5 },
      buildGenerateOptions: ({ body }: { body: SuggestionsRequest }) => {
        expect(body.prompt).toBe("prompt");
        return { maxRetries: 1 };
      },
    });

    const res = await handler(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "prompt" }),
      })
    );

    expect(generateObject).toHaveBeenCalled();
    expect(await res.json()).toEqual({
      suggestions: [{ shortSuggestion: "hi" }],
    });
  });

  it("returns 400 when prompt missing", async () => {
    const handler = createSuggestionsHandler({ model: "test" });
    const res = await handler(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
    expect(generateObject).not.toHaveBeenCalled();
  });
});

describe("createThreadTitleHandler", () => {
  const sampleMessages: UIMessage[] = [
    {
      id: "1",
      role: "user",
      parts: [{ type: "text", text: "Hello there" } as any],
    },
  ];

  it("uses fallback when model not provided", async () => {
    const fallback = vi.fn().mockResolvedValue("Fallback title");
    const handler = createThreadTitleHandler({ fallback, model: undefined });

    const res = await handler(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: sampleMessages }),
      })
    );

    expect(await res.json()).toEqual({ title: "Fallback title" });
    expect(fallback).toHaveBeenCalled();
  });

  it("sanitizes generated title when model available", async () => {
    (generateObject as unknown as vi.Mock).mockResolvedValue({
      object: { thread_title: "  My Title  " },
    });

    const handler = createThreadTitleHandler({
      model: "test",
    });

    const res = await handler(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: sampleMessages }),
      })
    );

    expect(generateObject).toHaveBeenCalled();
    expect(await res.json()).toEqual({ title: "My Title" });
  });
});

describe("createMcpToolsHandler", () => {
  it("returns serialized tool summaries", async () => {
    loadMcpToolsMock.mockResolvedValue({
      tools: {},
      toolSummaries: [{ name: "tool", description: "desc" }],
    });

    const handler = createMcpToolsHandler();
    const res = await handler(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          server: {
            id: "s",
            transport: { type: "sse", url: "http://example" },
          },
        }),
      })
    );

    expect(loadMcpToolsMock).toHaveBeenCalled();
    expect(await res.json()).toEqual({
      tools: [{ name: "tool", description: "desc" }],
    });
  });

  it("returns 400 when server missing", async () => {
    const handler = createMcpToolsHandler();
    const res = await handler(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
    expect(loadMcpToolsMock).not.toHaveBeenCalled();
  });
});
