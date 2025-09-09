"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Param = { name: string; type: string; description?: string };

type ApiMeta = {
  name: string;
  route: string;
  description: string;
  signature?: string;
  params?: Param[];
};

const API_MAP: Record<string, ApiMeta> = {
  useAIChat: {
    name: "useAIChat",
    route: "/api/hooks/use-ai-chat",
    description:
      "Main hook for managing chat state and AI interactions with automatic context and tool integration.",
    signature: `function useAIChat(options: {
  api: string;
  systemPrompt?: string;
  initialMessages?: UIMessage[];
  onFinish?: (message: UIMessage) => void;
  onError?: (error: Error) => void;
}): UseAIChatReturn`,
    params: [
      {
        name: "api",
        type: "string",
        description: "API endpoint for chat requests",
      },
      {
        name: "systemPrompt",
        type: "string?",
        description: "System prompt for the AI",
      },
      {
        name: "initialMessages",
        type: "UIMessage[]?",
        description: "Initial chat messages",
      },
      {
        name: "onFinish",
        type: "(message: UIMessage) => void?",
        description: "Callback when a message is completed",
      },
      {
        name: "onError",
        type: "(error: Error) => void?",
        description: "Error callback",
      },
    ],
  },
  useAIContext: {
    name: "useAIContext",
    route: "/api/hooks/use-ai-context",
    description:
      "Share React component state with the AI without causing re-renders.",
    signature: `function useAIContext(
  id: string,
  data: Record<string, unknown>,
  options?: {
    label?: string;
    description?: string;
    scope?: "session" | "conversation" | "message";
    priority?: number;
  }
): void`,
    params: [
      {
        name: "id",
        type: "string",
        description: "Unique identifier for the context item",
      },
      {
        name: "data",
        type: "Record<string, unknown>",
        description: "The data to share with the AI",
      },
      {
        name: "options.label",
        type: "string?",
        description: "Human-readable name for the context",
      },
      {
        name: "options.description",
        type: "string?",
        description: "Explains what this context represents",
      },
      {
        name: "options.scope",
        type: '"session" | "conversation" | "message"?',
        description: "Lifecycle scope (default: session)",
      },
      {
        name: "options.priority",
        type: "number?",
        description: "Higher numbers are sent first",
      },
    ],
  },
  useAIFocus: {
    name: "useAIFocus",
    route: "/api/hooks/use-ai-focus",
    description:
      "Enable users to explicitly mark which items should be prioritized in AI conversations.",
    signature: `function useAIFocus(): {
  setFocus: (id: string, item: FocusItem) => void;
  clearFocus: (id: string) => void;
  clearAllFocus: () => void;
  getFocus: (id: string) => FocusItem | undefined;
  focusedIds: string[];
  allFocusItems: FocusItem[];
  hasFocusedItems: boolean;
  focusItemsRecord: Record<string, FocusItem>;
}`,
  },
  useAIFrontendTool: {
    name: "useAIFrontendTool",
    route: "/api/hooks/use-ai-frontend-tool",
    description:
      "Register tools that the AI can execute in your React components for direct UI interaction.",
    signature: `function useAIFrontendTool(tool: {
  name: string;
  description: string;
  parameters: ZodSchema;
  execute: (params: any) => Promise<any> | any;
}): void`,
    params: [
      { name: "name", type: "string", description: "Unique tool identifier" },
      {
        name: "description",
        type: "string",
        description: "When/how the AI should use the tool",
      },
      {
        name: "parameters",
        type: "ZodSchema",
        description: "Parameters schema",
      },
      {
        name: "execute",
        type: "(params: any) => Promise<any> | any",
        description: "Execution handler",
      },
    ],
  },
  // Optional: component pages
  ChatContainer: {
    name: "ChatContainer",
    route: "/api/components/chat-container",
    description:
      "Main chat interface component with message display and input.",
  },
  ChatMessage: {
    name: "ChatMessage",
    route: "/api/components/chat-message",
    description:
      "Individual message component with support for different message types.",
  },
  ChatInput: {
    name: "ChatInput",
    route: "/api/components/chat-input",
    description: "Standalone input component for chat interfaces.",
  },
  ChatPopout: {
    name: "ChatPopout",
    route: "/api/components/chat-popout",
    description:
      "Popout chat UI that wraps ChatContainer with built-in state and a resizable overlay/inline panel.",
  },
};

export function Api({
  name,
  children,
}: {
  name: keyof typeof API_MAP | string;
  children?: React.ReactNode;
}) {
  const meta = API_MAP[name as keyof typeof API_MAP];
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const normalize = (p?: string | null) => (p ? p.replace(/\/+$/, "") : "");
  const isCurrent = normalize(pathname) === normalize(meta?.route);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      left: rect.left + window.scrollX,
      top: rect.bottom + window.scrollY,
      width: rect.width,
    });
  };

  const handleEnter = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
    // compute on open
    updatePosition();
  };

  const handleLeave = () => {
    // small delay so the user can move the mouse from the trigger to the card
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 70);
  };

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    updatePosition();
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  if (!meta) {
    // Fallback: just render inline code text if mapping is missing
    return <code>{children || name}</code>;
  }

  // If this inline mention refers to the page we're currently on,
  // render a neutral code chip without link or hover card.
  if (isCurrent) {
    return (
      <code className="px-1.5 py-0.5 rounded border bg-muted text-foreground">
        {children || meta.name}
      </code>
    );
  }

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex items-center align-baseline"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
      >
        <Link href={meta.route} className="align-baseline">
          <code className="px-1.5 py-0.5 rounded border bg-muted text-foreground hover:bg-muted/60 transition-colors">
            {children || meta.name}
          </code>
        </Link>
      </span>
      {open && position && typeof window !== "undefined"
        ? createPortal(
            <div
              className="z-50 w-[min(92vw,680px)] transition-opacity duration-150"
              style={{
                position: "absolute",
                left: position.left,
                top: position.top + 4,
              }}
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            >
              <div className="block rounded-lg border bg-card text-card-foreground shadow-lg p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{meta.name}</div>
                  <Link
                    href={meta.route}
                    className="text-xs text-primary hover:underline"
                  >
                    Open docs →
                  </Link>
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-snug">
                  {meta.description}
                </p>
                {meta.signature && (
                  <pre className="mt-3 overflow-auto rounded-md border bg-muted p-3 text-xs leading-relaxed">
                    <code>{meta.signature}</code>
                  </pre>
                )}
                {meta.params && meta.params.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {meta.params.map((p) => (
                      <div key={p.name} className="text-xs">
                        <span className="font-mono font-medium">{p.name}</span>
                        <span className="text-muted-foreground">
                          : {p.type}
                        </span>
                        {p.description && (
                          <span className="text-muted-foreground">
                            {" "}
                            — {p.description}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export default Api;
