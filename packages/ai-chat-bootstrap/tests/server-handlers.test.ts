import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatRequest, SuggestionsRequest } from "../lib/types/chat";
import type { CompressionServiceResponse } from "../lib/types/compression";
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
  createCompressionHandler,
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

describe("createCompressionHandler", () => {
  console.log("createCompressionHandler tests starting");
  const sampleMessages: UIMessage[] = [
    {
      id: "m1",
      role: "user",
      parts: [{ type: "text", text: "Hello" } as any],
    },
    {
      id: "m2",
      role: "assistant",
      parts: [{ type: "text", text: "Hi there" } as any],
    },
  ];

  it("calls the configured model to produce compression artifacts", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const modelResolver = vi.fn().mockReturnValue("compression-model");
    (generateObject as unknown as vi.Mock).mockResolvedValue({
      object: {
        surviving_message_ids: ["m2"],
        artifacts: [
          {
            title: "Summary",
            summary: "Condensed summary",
            category: "actions",
            source_message_ids: ["m1"],
          },
        ],
      },
    });

    const handler = createCompressionHandler({
      model: ({ requestedModel }) => {
        expect(requestedModel).toBe("gpt-4o-mini");
        return modelResolver();
      },
    });

    const requestBody = {
      messages: sampleMessages,
      pinnedMessages: [],
      artifacts: [],
      snapshot: null,
      usage: {
        totalTokens: 40,
        pinnedTokens: 0,
        artifactTokens: 0,
        survivingTokens: 40,
        updatedAt: 0,
      },
      config: {
        maxTokenBudget: 100,
        compressionThreshold: 0.8,
        pinnedMessageLimit: null,
        model: "gpt-4o-mini",
      },
      reason: "threshold" as const,
    };

    let response: Response;
    try {
      response = await handler(
        new Request("http://test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        })
      );
    } finally {
      nowSpy.mockRestore();
    }

    expect(response.status).toBe(200);
    expect(modelResolver).toHaveBeenCalled();
    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({ model: "compression-model" })
    );

    const payload = (await response.json()) as CompressionServiceResponse;
    expect(payload.artifacts).toHaveLength(1);
    expect(payload.snapshot.artifactIds).toHaveLength(1);
    expect(payload.snapshot.survivingMessageIds).toContain("m2");
    expect(payload.snapshot.survivingMessageIds).not.toContain("m1");
  });

  it("drops summarized messages from survivors when artifacts cover them", async () => {
    const modelResolver = vi.fn().mockReturnValue("compression-model");
    (generateObject as unknown as vi.Mock).mockResolvedValue({
      object: {
        surviving_message_ids: [],
        artifacts: [
          {
            summary: "All context captured",
            source_message_ids: ["m1", "m2"],
          },
        ],
      },
    });

    const handler = createCompressionHandler({
      model: modelResolver,
      minRecentMessages: 0,
    });

    const requestBody = {
      messages: [
        {
          id: "m1",
          role: "user",
          parts: [{ type: "text", text: "First" } as any],
        },
        {
          id: "m2",
          role: "assistant",
          parts: [{ type: "text", text: "Second" } as any],
        },
      ] satisfies UIMessage[],
      pinnedMessages: [],
      artifacts: [],
      snapshot: null,
      usage: {
        totalTokens: 80,
        pinnedTokens: 0,
        artifactTokens: 0,
        survivingTokens: 80,
        updatedAt: 0,
      },
      config: {
        maxTokenBudget: 100,
        compressionThreshold: 0.8,
        pinnedMessageLimit: null,
        model: "compression-model",
      },
      reason: "threshold" as const,
    };

    const response = await handler(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as CompressionServiceResponse;
    expect(payload.snapshot.survivingMessageIds).toEqual([]);
    expect(payload.usage?.survivingTokens).toBe(0);
    expect(payload.artifacts).toHaveLength(1);
  });

  it("returns 400 when messages are missing", async () => {
    const handler = createCompressionHandler({ model: () => "model" });

    const response = await handler(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when the resolver cannot provide a model", async () => {
    const handler = createCompressionHandler({ model: () => null });

    const requestBody = {
      messages: sampleMessages,
      pinnedMessages: [],
      artifacts: [],
      snapshot: null,
      usage: {
        totalTokens: 40,
        pinnedTokens: 0,
        artifactTokens: 0,
        survivingTokens: 40,
        updatedAt: 0,
      },
      config: {
        maxTokenBudget: 100,
        compressionThreshold: 0.8,
        pinnedMessageLimit: null,
        model: null,
      },
      reason: "threshold" as const,
    };

    const response = await handler(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })
    );

    expect(response.status).toBe(400);
    expect(generateObject).not.toHaveBeenCalled();
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
      errors: [],
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
    expect(res.status).toBe(200);
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

  it("surfaces load errors in response", async () => {
    loadMcpToolsMock.mockResolvedValue({
      tools: {},
      toolSummaries: [],
      errors: [
        {
          serverId: "s",
          serverName: "Server",
          url: "http://example",
          message: "boom",
        },
      ],
    });

    const handler = createMcpToolsHandler();
    const res = await handler(
      new Request("http://test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          server: {
            id: "s",
            name: "Server",
            transport: { type: "sse", url: "http://example" },
          },
        }),
      })
    );

    expect(res.status).toBe(207);
    expect(await res.json()).toEqual({
      tools: [],
      errors: [
        {
          serverId: "s",
          serverName: "Server",
          url: "http://example",
          message: "boom",
        },
      ],
    });
  });

  it("forwards configured headers to the MCP descriptor", async () => {
    loadMcpToolsMock.mockResolvedValue({
      tools: {},
      toolSummaries: [],
      errors: [],
    });

    const handler = createMcpToolsHandler({
      forwardHeaders: ["authorization", "x-custom"],
    });
    await handler(
      new Request("http://test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
          "X-Custom": "value",
        },
        body: JSON.stringify({
          server: {
            id: "s",
            transport: { type: "sse", url: "http://example", headers: { foo: "bar" } },
          },
        }),
      })
    );

    expect(loadMcpToolsMock).toHaveBeenCalledWith([
      {
        id: "s",
        transport: {
          type: "sse",
          url: "http://example",
          headers: { foo: "bar", authorization: "Bearer token", "x-custom": "value" },
        },
      },
    ]);
  });
});
