"use client";
import { ChatPopout, type UIMessage } from "ai-chat-bootstrap";
import { useState } from "react";

type PopoutChatExampleProps = {
  mode?: "inline" | "overlay";
};

const PREVIEW_MESSAGES: UIMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "Hi there! I'm your floating assistant. Try opening the chat or switching between inline and overlay modes.",
      },
    ],
  },
];

// A lightweight live demo for ChatPopout showcasing layout and controls
export function PopoutChatExample({
  mode = "overlay",
}: PopoutChatExampleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative h-[600px] w-full border rounded-md bg-muted/30 overflow-hidden flex">
      {/* Demo content area so inline mode participates in flex layout */}
      <div className="flex-1 p-4 text-sm text-muted-foreground">
        This area represents your app content. In inline mode, the chat sits as
        a flex sidebar and fills the parent height.
      </div>
      <ChatPopout
        messages={{
          systemPrompt:
            "You are an embedded assistant helping users while they browse the app interface.",
          initial: PREVIEW_MESSAGES,
        }}
        header={{ title: "Assistant" }}
        ui={{ placeholder: "Hook up your API to start chatting..." }}
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
      transport={{ api: "/api/chat" }}
      messages={{ systemPrompt: "You are a helpful assistant." }}
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
import { ChatPopout } from "ai-chat-bootstrap";

export function PopoutChat() {
  return (
    // To confine the overlay to a parent container, set the parent to position: relative
    // and override the popout to use absolute positioning with height: 100%.
    <ChatPopout
      transport={{ api: "/api/chat" }}
      messages={{ systemPrompt: "You are a helpful assistant." }}
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
