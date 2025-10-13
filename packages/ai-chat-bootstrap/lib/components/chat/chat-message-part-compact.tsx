import {
  getToolName,
  UIMessage,
  type DynamicToolUIPart,
  type ToolUIPart,
} from "ai";
import isEqual from "fast-deep-equal";
import React, { ReactNode } from "react";
import { CodeBlock } from "../../components/ai-elements/code-block";
import { useAIToolsStore } from "../../stores";
import { CompactReasoning } from "./elements/compact-reasoning";
import { CompactResponse } from "./elements/compact-response";
import { CompactSource } from "./elements/compact-source";
import { CompactTool } from "./elements/compact-tool";
import type { ResponseProps } from "../ai-elements/response";

type AnyUIPart = UIMessage["parts"][number];

function ChatMessagePartCompactImpl({
  part,
  streaming = false,
  responseProps,
}: {
  part: AnyUIPart;
  streaming?: boolean;
  responseProps?: ResponseProps;
}) {
  const getTool = useAIToolsStore((s) => s.getTool);
  void streaming;

  switch (part.type) {
    case "text":
      return (
        <CompactResponse {...(responseProps ?? {})}>
          {part.text}
        </CompactResponse>
      );

    case "reasoning":
      return (
        <CompactReasoning isStreaming={streaming}>
          {part.text}
        </CompactReasoning>
      );

    case "source-url":
      return <CompactSource href={part.url} title={part.title} />;

    case "source-document":
      return <CompactSource href={"#"} title={part.title} />;

    case "file":
      return (
        <div className="rounded-lg border p-1 bg-accent">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-medium">{part.filename}</span>
            <span className="text-[8px] text-muted-foreground">
              {part.mediaType}
            </span>
          </div>
        </div>
      );

    default:
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

        const toolStoreTool = getTool(baseName);

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

        if (customRendered) {
          return (
            <div className="rounded-md border bg-[var(--acb-tool-bg)] border-[var(--acb-tool-border)] p-1">
              {customRendered}
            </div>
          );
        }

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
          <CompactTool
            type={toolPart.type}
            state={toolPart.state || "input-streaming"}
            label={displayLabel}
            input={toolPart.input}
            output={fallbackOutput}
            errorText={combinedErrorText}
          />
        );
      }
      return null;
  }
}

export const ChatMessagePartCompact = React.memo(
  ChatMessagePartCompactImpl,
  (prev, next) => {
    if (
      prev.part === next.part &&
      prev.streaming === next.streaming &&
      prev.responseProps === next.responseProps
    )
      return true;

    if (prev.part.type !== next.part.type) return false;
    if (prev.streaming !== next.streaming) return false;
    if (prev.responseProps !== next.responseProps) return false;

    return isEqual(prev.part, next.part);
  }
);
