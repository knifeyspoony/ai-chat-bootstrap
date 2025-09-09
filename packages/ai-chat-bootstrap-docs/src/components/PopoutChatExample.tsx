"use client";
import { ChatPopout, type UIMessage } from "ai-chat-bootstrap";
import { useState } from "react";

// A lightweight live demo for ChatPopout using mock chat functionality
export function PopoutChatExample({
  mode = "overlay" as "inline" | "overlay",
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: input }],
    };
    setMessages((m) => [...m, userMessage]);
    const userInput = input;
    setInput("");
    setIsLoading(true);
    // Simulate a network/AI delay
    setTimeout(() => {
      const assistantMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [
          {
            type: "text",
            text: `You said: "${userInput}". This is a mock response from the AI popout chat.`,
          },
        ],
      };
      setMessages((m) => [...m, assistantMessage]);
      setIsLoading(false);
    }, 800);
  }

  return (
    <div className="relative h-[420px] w-full border rounded-md bg-muted/30 overflow-hidden flex">
      {/* Demo content area so inline mode participates in flex layout */}
      <div className="flex-1 p-4 text-sm text-muted-foreground">
        This area represents your app content. In inline mode, the chat sits as
        a flex sidebar and fills the parent height.
      </div>
      <ChatPopout
        header={{ title: "Assistant" }}
        ui={{ placeholder: "Ask me anything..." }}
        state={{ messages, isLoading }}
        inputProps={{
          value: input,
          onChange: setInput,
          onSubmit: handleSubmit,
        }}
        popout={{
          mode,
          position: "right",
          width: { default: 420, min: 320, max: 640 },
          // Ensure both modes use the parent height (not the viewport)
          height: "100%",
          // Constrain overlay to the parent container
          container: mode === "overlay" ? "parent" : undefined,
          isOpen: open,
          onOpenChange: setOpen,
        }}
        button={{ show: true, label: "Chat", container: "parent" }}
      />
    </div>
  );
}

export const POPOUT_CHAT_INLINE_SOURCE = `"use client";
import React from "react";
import { ChatPopout } from "ai-chat-bootstrap";

export function PopoutChat() {
  return (
      <ChatPopout
        header={{ title: "Assistant" }}
        ui={{ placeholder: "Ask me anything..." }}
  popout={{ mode: "inline", position: "right", width: { default: 420 }, height: "100%" }}
      />

      {/* Overlay mode example positioned left with custom sizes */}
    </>
  container: "parent"
}`;

export const POPOUT_CHAT_OVERLAY_SOURCE = `"use client";
import React from "react";
import { ChatPopout } from "ai-chat-bootstrap";

export function PopoutChat() {
  return (
    // To confine the overlay to a parent container, set the parent to position: relative
    // and override the popout to use absolute positioning with height: 100%.
    <ChatPopout
      header={{ title: "Assistant" }}
      ui={{ placeholder: "Ask me anything..." }}
      popout={{
        mode: "overlay",
        position: "right",
        width: { default: 420, min: 320, max: 640 },
        height: "100%",
        className: "absolute inset-y-0"
      }}
      button={{ show: true, label: "Chat" }}
    />
  );
}`;
