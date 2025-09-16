import { getToolName, UIMessage, type ToolUIPart } from "ai";
import { ReactNode } from "react";
import { CodeBlock } from "../../components/ai-elements/code-block";
import { useAIToolsStore } from "../../stores";
import { ChatTool, type ChatToolVariant } from "./chat-tool";
import { ChatResponse } from "./chat-response";
import { ChatReasoning } from "./chat-reasoning";
import { ChatSource } from "./chat-source";

type AnyUIPart = UIMessage["parts"][number];

export function ChatMessagePart({
  part,
  streaming = false,
  variant = 'md',
}: {
  part: AnyUIPart;
  streaming?: boolean;
  variant?: ChatToolVariant;
}) {
  // Remove unused streaming parameter for now
  const getTool = useAIToolsStore((s) => s.getTool);
  void streaming;
  switch (part.type) {
    case "text":
      return <ChatResponse variant={variant}>{part.text}</ChatResponse>;

    case "reasoning":
      return <ChatReasoning variant={variant} isStreaming={streaming}>{part.text}</ChatReasoning>;

    case "source-url":
      return <ChatSource variant={variant} href={part.url} title={part.title} />;

    case "source-document":
      return <ChatSource variant={variant} href={"#"} title={part.title} />;

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
      if (part.type?.startsWith("tool-") || part.type == "dynamic-tool") {
        const toolPart = part as ToolUIPart;
        // Extract the base tool name (library helper handles variations)
        const baseName = getToolName(toolPart);

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
            customRendered = toolStoreTool.render(toolPart.output as any);
          } catch (err) {
            customRenderError = err;
          }
        }

        // If custom render succeeded, show only that (no default chrome)
        if (customRendered) {
          return (
            <ChatTool variant={variant}>
              <div className="rounded-md border bg-[var(--acb-tool-bg)] border-[var(--acb-tool-border)] p-3">
                {customRendered}
              </div>
            </ChatTool>
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

        const combinedErrorText =
          toolPart.errorText || customRenderError
            ? [
                toolPart.errorText,
                customRenderError
                  ? `Custom render error: ${
                      (customRenderError as any)?.message || customRenderError
                    }`
                  : undefined,
              ]
                .filter(Boolean)
                .join("\n")
            : undefined;

        return (
          <ChatTool
            variant={variant}
            type={toolPart.type}
            state={toolPart.state || "input-streaming"}
            input={toolPart.input}
            output={fallbackOutput}
            errorText={combinedErrorText}
          />
        );
      }
      return null;
  }
}
