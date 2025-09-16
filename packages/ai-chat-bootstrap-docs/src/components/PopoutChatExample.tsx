"use client";
import { ChatPopout } from "ai-chat-bootstrap";
import { useState } from "react";
import { useMockAIChat } from "./shared/useMockAIChat";

// A lightweight live demo for ChatPopout using mock chat functionality
export function PopoutChatExample({
  mode = "overlay" as "inline" | "overlay",
}) {
  const [open, setOpen] = useState(false);
  const chat = useMockAIChat({
    responseGenerator: (text) => `You said: "${text}". This is a mock response from the AI popout chat.`,
    responseDelay: 800,
  });

  return (
    <div className="relative h-[420px] w-full border rounded-md bg-muted/30 overflow-hidden flex">
      {/* Demo content area so inline mode participates in flex layout */}
      <div className="flex-1 p-4 text-sm text-muted-foreground">
        This area represents your app content. In inline mode, the chat sits as
        a flex sidebar and fills the parent height.
      </div>
      <ChatPopout
        chat={chat}
        header={{ title: "Assistant" }}
        ui={{ placeholder: "Ask me anything..." }}
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
import { ChatPopout, useAIChat } from "ai-chat-bootstrap";

export function PopoutChat() {
  const chat = useAIChat({
    api: "/api/chat",
    systemPrompt: "You are a helpful assistant."
  });

  return (
    <ChatPopout
      chat={chat}
      header={{ title: "Assistant" }}
      ui={{ placeholder: "Ask me anything..." }}
      popout={{
        mode: "inline",
        position: "right",
        width: { default: 420 },
        height: "100%"
      }}
    />
  );
}`;

export const POPOUT_CHAT_OVERLAY_SOURCE = `"use client";
import React from "react";
import { ChatPopout, useAIChat } from "ai-chat-bootstrap";

export function PopoutChat() {
  const chat = useAIChat({
    api: "/api/chat",
    systemPrompt: "You are a helpful assistant."
  });

  return (
    // To confine the overlay to a parent container, set the parent to position: relative
    // and override the popout to use absolute positioning with height: 100%.
    <ChatPopout
      chat={chat}
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
