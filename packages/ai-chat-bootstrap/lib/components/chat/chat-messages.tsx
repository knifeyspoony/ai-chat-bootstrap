import { getToolName, type ToolUIPart, type UIMessage } from "ai";
import { UserIcon } from "lucide-react";
import React, { forwardRef, ReactNode, useImperativeHandle } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { CodeBlock } from "../../components/ai-elements/code-block";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "../../components/ai-elements/conversation";
import { Loader } from "../../components/ai-elements/loader";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "../../components/ai-elements/message";
import { Reasoning } from "../../components/ai-elements/reasoning";
import { Response } from "../../components/ai-elements/response";
import { Source } from "../../components/ai-elements/sources";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "../../components/ai-elements/tool";
import { Badge } from "../../components/ui/badge";
import { AnyFrontendTool, useAIToolsStore } from "../../stores";
import { cn } from "../../utils";

export interface ChatMessagesProps {
  messages: UIMessage[];
  assistantAvatar?: string;
  userAvatar?: string;
  isLoading?: boolean;
  className?: string;
  messageClassName?: string;
  emptyState?: React.ReactNode;
}

export interface ChatMessagesHandle {
  scrollToBottom: () => void;
}

export const ChatMessages = forwardRef<ChatMessagesHandle, ChatMessagesProps>(
  (
    {
      messages,
      isLoading = false,
      className,
      messageClassName,
      emptyState,
      assistantAvatar = "/acb.png",
      userAvatar,
    },
    ref
  ) => {
    const getTool = useAIToolsStore((s) => s.getTool);

    const defaultEmptyState = (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div className="text-muted-foreground">
          <p className="text-lg mb-2">No messages yet</p>
          <p className="text-sm">Start a conversation below</p>
        </div>
      </div>
    );

    return (
      <Conversation className={cn("flex-1 text-left", className)}>
        <ConversationContent>
          {messages.length === 0
            ? emptyState || defaultEmptyState
            : messages
                .filter((message) => {
                  // Filter out empty assistant messages (likely from cancelled requests)
                  if (message.role === "assistant") {
                    const hasContent = message.parts?.some(
                      (part) =>
                        (part.type === "text" && part.text?.trim()) ||
                        (part.type === "reasoning" && part.text?.trim()) ||
                        part.type?.startsWith("tool-") ||
                        part.type?.startsWith("data-") ||
                        part.type === "file" ||
                        part.type === "source-url" ||
                        part.type === "source-document"
                    );
                    return hasContent;
                  }
                  return true;
                })
                .map((message, index) => {
                  const isUser = message.role === "user";
                  const isSystem = message.role === "system";
                  const isLast = index === messages.length - 1;
                  const isStreamingLast =
                    isLoading && isLast && message.role === "assistant";

                  if (isSystem) {
                    const firstPart = message.parts?.[0];
                    const systemText =
                      firstPart && "text" in firstPart
                        ? firstPart.text
                        : "System message";
                    return (
                      <div
                        key={message.id ?? index}
                        className={cn(
                          "flex justify-center px-6 py-4 w-full",
                          messageClassName
                        )}
                      >
                        <Badge variant="outline" className="text-xs">
                          {systemText}
                        </Badge>
                      </div>
                    );
                  }

                  return (
                    <Message
                      key={message.id ?? index}
                      from={message.role}
                      className={messageClassName}
                    >
                      <MessageContent>
                        {message.parts?.map((part, partIndex: number) => (
                          <MessagePart
                            key={partIndex}
                            part={part}
                            streaming={isStreamingLast}
                            getTool={getTool}
                          />
                        ))}
                      </MessageContent>
                      {/* Icon-based avatars (images commented out per request) */}
                      <MessageAvatar
                        //
                        name={isUser ? "You" : "Assistant"}
                        src={
                          isUser
                            ? userAvatar || <UserIcon size={24} />
                            : assistantAvatar
                        }
                      />
                    </Message>
                  );
                })}

          {isLoading && (
            <Message from="assistant">
              <MessageContent>
                <Loader />
              </MessageContent>
              <MessageAvatar name="Assistant" src={assistantAvatar} />
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
        <StickToBottomConnector ref={ref} />
      </Conversation>
    );
  }
);

const StickToBottomConnector = forwardRef<ChatMessagesHandle>(
  function StickToBottomConnector(_props, ref) {
    const { scrollToBottom } = useStickToBottomContext();
    useImperativeHandle(
      ref,
      () => ({
        scrollToBottom: () => {
          try {
            scrollToBottom();
          } catch {
            // no-op
          }
        },
      }),
      [scrollToBottom]
    );
    return null;
  }
);

ChatMessages.displayName = "ChatMessages";

type AnyUIPart = UIMessage["parts"][number];

function MessagePart({
  part,
  streaming = false,
  getTool,
}: {
  part: AnyUIPart;
  streaming?: boolean;
  getTool: (name: string) => AnyFrontendTool | undefined;
}) {
  // Remove unused streaming parameter for now
  void streaming;
  switch (part.type) {
    case "text":
      return <Response>{part.text}</Response>;

    case "reasoning":
      return <Reasoning>{part.text}</Reasoning>;

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
      if (part.type?.startsWith("tool-")) {
        const toolPart = part as ToolUIPart;
        // Extract the base tool name (library helper handles variations)
        const baseName = getToolName(toolPart);

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
          return <>{customRendered}</>;
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
          <Tool>
            <ToolHeader
              type={toolPart.type}
              state={toolPart.state || "input-streaming"}
            />
            <ToolContent>
              {Boolean(toolPart.input) && <ToolInput input={toolPart.input} />}
              {(toolPart.output || combinedErrorText) && (
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
