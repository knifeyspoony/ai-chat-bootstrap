import {
  getToolName,
  UIMessage,
  type DynamicToolUIPart,
  type ToolUIPart,
} from "ai";
import isEqual from "fast-deep-equal";
import React, { ReactNode } from "react";
import { CodeBlock } from "../../components/ai-elements/code-block";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "../../components/ai-elements/reasoning";
import { Response } from "../../components/ai-elements/response";
import type { ResponseProps } from "../ai-elements/response";
import { Source } from "../../components/ai-elements/sources";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "../../components/ai-elements/tool";
import { useAIToolsStore, useAIMCPServersStore } from "../../stores";

type AnyUIPart = UIMessage["parts"][number];

function ChatMessagePartImpl({
  part,
  streaming = false,
  responseProps,
}: {
  part: AnyUIPart;
  streaming?: boolean;
  responseProps?: ResponseProps;
}) {
  const getTool = useAIToolsStore((s) => s.getTool);
  const getMCPToolRenderer = useAIMCPServersStore(
    (s) => s.getToolRendererByToolName
  );

  switch (part.type) {
    case "text":
      return React.createElement(Response, {
        ...(responseProps ?? {}),
        children: part.text,
      });

    case "reasoning":
      return (
        <Reasoning isStreaming={streaming}>
          <ReasoningTrigger />
          <ReasoningContent>{part.text}</ReasoningContent>
        </Reasoning>
      );

    case "source-url":
      return <Source href={part.url} title={part.title} />;

    case "source-document":
      return <Source href={"#"} title={part.title} />;

    case "file":
      return (
        <div className="rounded-lg border p-3 bg-accent">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{part.filename}</span>
            <span className="text-xs text-muted-foreground">
              {part.mediaType}
            </span>
          </div>
        </div>
      );

    default:
      // Handle tool-* parts (data-* could be added later)
      if (part.type?.startsWith("tool-") || part.type === "dynamic-tool") {
        const isDynamicTool = part.type === "dynamic-tool";
        const toolPart = part as ToolUIPart | DynamicToolUIPart;

        const baseName = isDynamicTool
          ? (toolPart as DynamicToolUIPart).toolName
          : getToolName(toolPart as ToolUIPart);

        const displayLabel = (() => {
          if (typeof baseName === "string" && baseName.trim() !== "") {
            return baseName;
          }
          if (!isDynamicTool && toolPart.type.startsWith("tool-")) {
            const trimmed = toolPart.type.slice("tool-".length);
            if (trimmed) {
              return trimmed;
            }
          }
          if (isDynamicTool) {
            const dynamicName = (toolPart as DynamicToolUIPart).toolName;
            if (dynamicName?.trim()) {
              return dynamicName;
            }
          }
          return toolPart.type;
        })();

        if (baseName?.startsWith("acb_")) {
          return null;
        }

        // Lookup registered frontend tool to see if it defines a custom render
        const toolStoreTool = getTool(baseName);

        // Attempt custom render ONLY when output is available
        let customRendered: ReactNode | undefined;
        let customRenderError: unknown;
        if (
          toolStoreTool?.render &&
          toolPart.state === "output-available" &&
          toolPart.output
        ) {
          try {
            customRendered = toolStoreTool.render(toolPart.output);
          } catch (err) {
            customRenderError = err;
          }
        }

        // If no frontend tool renderer, check for MCP tool renderer
        if (
          !customRendered &&
          !customRenderError &&
          toolPart.state === "output-available" &&
          toolPart.output
        ) {
          const mcpRenderer = getMCPToolRenderer(baseName);
          if (mcpRenderer) {
            try {
              customRendered = mcpRenderer(toolPart.output);
            } catch (err) {
              console.error("[ChatMessagePart] MCP renderer error:", err);
              customRenderError = err;
            }
          }
        }

        // If custom render succeeded, show only that (no default chrome)
        if (customRendered) {
          return (
            <div className="rounded-md border bg-[var(--acb-tool-bg)] border-[var(--acb-tool-border)] p-3">
              {customRendered}
            </div>
          );
        }

        // Build fallback output (default tool chrome)
        const fallbackOutput = toolPart.output ? (
          typeof toolPart.output === "string" ? (
            toolPart.output
          ) : (
            <CodeBlock
              code={JSON.stringify(toolPart.output, null, 2)}
              language="json"
            />
          )
        ) : undefined;

        const customRenderErrorText =
          customRenderError instanceof Error
            ? customRenderError.message
            : typeof customRenderError === "string"
              ? customRenderError
              : undefined;

        const combinedErrorText =
          toolPart.errorText || customRenderErrorText
            ? [
                toolPart.errorText,
                customRenderErrorText
                  ? `Custom render error: ${customRenderErrorText}`
                  : undefined,
              ]
                .filter(Boolean)
                .join("\n")
            : undefined;

        return (
          <Tool>
            <ToolHeader
              type={toolPart.type}
              state={toolPart.state || "input-streaming"}
              label={displayLabel}
            />
            <ToolContent>
              {Boolean(toolPart.input) && <ToolInput input={toolPart.input} />}
              {(fallbackOutput || combinedErrorText) && (
                <ToolOutput
                  output={fallbackOutput}
                  errorText={combinedErrorText}
                />
              )}
            </ToolContent>
          </Tool>
        );
      }
      return null;
  }
}

export const ChatMessagePart = React.memo(ChatMessagePartImpl, (prev, next) => {
  // Fast path: same reference
  if (
    prev.part === next.part &&
    prev.streaming === next.streaming &&
    prev.responseProps === next.responseProps
  )
    return true;

  // Type-specific comparisons
  if (prev.part.type !== next.part.type) return false;
  if (prev.streaming !== next.streaming) return false;
  if (prev.responseProps !== next.responseProps) return false;

  // Deep compare the part content
  return isEqual(prev.part, next.part);
});
