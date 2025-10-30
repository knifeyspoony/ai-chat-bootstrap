import { useMemo, useEffect, useRef } from "react";
import type { PrepareSendMessagesRequest } from "ai";
import { DefaultChatTransport, UIMessage } from "ai";
import {
  useAIContextStore,
  useAIToolsStore,
  useAIFocusStore,
  useAIMCPServersStore,
} from "../stores";
import type { SerializedMCPServer } from "../stores/mcp";
import type { SerializedTool } from "../stores/tools";
import type { ChatRequest } from "../types/chat";
import { buildEnrichedSystemPrompt } from "../utils/prompt-utils";
import { logDevError } from "../utils/dev-logger";

const isSerializedToolArray = (value: unknown): value is SerializedTool[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item !== null &&
      typeof item === "object" &&
      "name" in item &&
      typeof (item as { name?: unknown }).name === "string"
  );

const isSerializedMCPServerArray = (
  value: unknown
): value is SerializedMCPServer[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item !== null &&
      typeof item === "object" &&
      "id" in item &&
      typeof (item as { id?: unknown }).id === "string" &&
      "transport" in item &&
      typeof (item as { transport?: unknown }).transport === "object"
  );

export interface UseChatTransportOptions {
  api: string;
  systemPrompt?: string;
  chainOfThoughtEnabled: boolean;
  selectedModelId?: string;
  buildCompressionRequestPayload: (
    messages: UIMessage[]
  ) => Promise<{
    messages: UIMessage[];
    pinnedMessageIds: string[];
    artifactIds: string[];
    survivingMessageIds: string[];
  }>;
  userPrepareSendMessagesRequest?: PrepareSendMessagesRequest<UIMessage>;
  showErrorMessages?: boolean;
}

/**
 * Hook to create and manage the chat transport with dynamic request preparation.
 * Handles serialization of context, tools, focus, and MCP servers for each request.
 */
export function useChatTransport({
  api,
  systemPrompt,
  chainOfThoughtEnabled,
  selectedModelId,
  buildCompressionRequestPayload,
  userPrepareSendMessagesRequest,
  showErrorMessages = false,
}: UseChatTransportOptions) {
  const systemPromptRef = useRef(systemPrompt);
  const selectedModelRef = useRef<string | undefined>(selectedModelId);

  // Update refs when values change
  useEffect(() => {
    systemPromptRef.current = systemPrompt;
  }, [systemPrompt]);

  useEffect(() => {
    selectedModelRef.current = selectedModelId;
  }, [selectedModelId]);

  // Create transport with dynamic request preparation - only recreate when api changes
  const chatTransport = useMemo(() => {
    return new DefaultChatTransport({
      api,
      prepareSendMessagesRequest: async (options) => {
        // Get fresh store data for each request - called only when sending messages
        const currentContext = await useAIContextStore.getState().serialize();
        const currentTools = useAIToolsStore
          .getState()
          .serializeToolsForBackend();
        const currentFocusItems = useAIFocusStore.getState().getAllFocusItems();
        const mcpStore = useAIMCPServersStore.getState();
        const currentMcpServers = mcpStore.serializeServersForBackend();
        const mcpToolSummaries = mcpStore.getAllToolSummaries();
        const callerBody = (options.body ?? {}) as Record<string, unknown>;

        // Per-call overrides validated for expected structure
        const overrideTools = isSerializedToolArray(callerBody["tools"])
          ? callerBody["tools"]
          : undefined;
        const overrideMcpServers = isSerializedMCPServerArray(
          callerBody["mcpServers"]
        )
          ? callerBody["mcpServers"]
          : undefined;
        const overrideSystemPrompt =
          typeof callerBody["systemPrompt"] === "string"
            ? (callerBody["systemPrompt"] as string)
            : undefined;
        const overrideEnrichedSystemPrompt =
          typeof callerBody["enrichedSystemPrompt"] === "string"
            ? (callerBody["enrichedSystemPrompt"] as string)
            : undefined;
        const overrideModel =
          typeof callerBody["model"] === "string"
            ? (callerBody["model"] as string)
            : undefined;

        const toolsToSend = overrideTools ?? currentTools;
        const mcpServersToSend = overrideMcpServers ?? currentMcpServers;
        const systemPromptToSend =
          overrideSystemPrompt ?? systemPromptRef.current;

        const toolSummaryMap = new Map<
          string,
          {
            name: string;
            description?: string;
            source?: "frontend" | "mcp";
          }
        >();
        const upsertToolSummary = (
          name: string,
          description: string | undefined,
          source: "frontend" | "mcp"
        ) => {
          const existing = toolSummaryMap.get(name);
          const nextDescription =
            description?.trim() !== ""
              ? description
              : existing?.description ?? description;
          const nextSource =
            source === "mcp" || existing?.source === "mcp"
              ? "mcp"
              : existing?.source ?? source;
          toolSummaryMap.set(name, {
            name,
            description: nextDescription,
            source: nextSource,
          });
        };

        toolsToSend.forEach((tool) => {
          if (!tool?.name) return;
          upsertToolSummary(tool.name, tool.description, "frontend");
        });
        mcpToolSummaries.forEach((tool) => {
          if (!tool?.name) return;
          upsertToolSummary(tool.name, tool.description, "mcp");
        });
        const combinedToolSummaries = Array.from(toolSummaryMap.values());

        const compressionPayload = await buildCompressionRequestPayload(
          options.messages as UIMessage[]
        );

        const messagesForRequest = compressionPayload.messages;

        // Build enriched system prompt unless explicitly supplied
        const enrichedSystemPromptToSend =
          overrideEnrichedSystemPrompt ??
          buildEnrichedSystemPrompt({
            originalSystemPrompt: systemPromptToSend,
            context: currentContext,
            focus: currentFocusItems,
            tools: combinedToolSummaries,
            chainOfThoughtEnabled,
          });

        const body: ChatRequest & Record<string, unknown> = {
          ...callerBody,
          messages: messagesForRequest,
          context: currentContext,
          tools: toolsToSend,
          mcpServers: mcpServersToSend,
          focus: currentFocusItems,
          systemPrompt: systemPromptToSend,
          enrichedSystemPrompt: enrichedSystemPromptToSend,
        };

        body.compression = {
          pinnedMessageIds: compressionPayload.pinnedMessageIds,
          artifactIds: compressionPayload.artifactIds,
          survivingMessageIds: compressionPayload.survivingMessageIds,
        };

        if (overrideModel !== undefined) {
          body.model = overrideModel;
        } else if (selectedModelRef.current) {
          body.model = selectedModelRef.current;
        }

        const preparedRequest = {
          ...options,
          body,
        };

        if (!userPrepareSendMessagesRequest) {
          return preparedRequest;
        }

        try {
          const userResult = await userPrepareSendMessagesRequest({
            ...options,
            body,
          });

          if (!userResult) {
            return preparedRequest;
          }

          const mergedBody = userResult.body ?? preparedRequest.body;
          const mergedHeaders = userResult.headers ?? preparedRequest.headers;
          const mergedCredentials =
            userResult.credentials ?? preparedRequest.credentials;
          const mergedApi = userResult.api ?? preparedRequest.api ?? api;

          return {
            ...options,
            body: mergedBody,
            headers: mergedHeaders,
            credentials: mergedCredentials,
            api: mergedApi,
          };
        } catch (error) {
          logDevError(
            "[acb][useChatTransport] prepareSendMessagesRequest callback failed",
            error,
            showErrorMessages
          );
          return preparedRequest;
        }
      },
    });
  }, [
    api,
    chainOfThoughtEnabled,
    buildCompressionRequestPayload,
    userPrepareSendMessagesRequest,
    showErrorMessages,
  ]);

  return chatTransport;
}
