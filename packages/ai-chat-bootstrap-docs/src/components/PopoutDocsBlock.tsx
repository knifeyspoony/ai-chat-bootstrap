"use client";
import React from "react";
import { CodeToggleExample } from "./CodeToggleExample";
import {
  POPOUT_CHAT_INLINE_SOURCE,
  POPOUT_CHAT_OVERLAY_SOURCE,
  PopoutChatExample,
} from "./PopoutChatExample";

export function PopoutDocsBlock() {
  const [mode, setMode] = React.useState<"inline" | "overlay">("overlay");

  const variants = React.useMemo(
    () => [
      { key: "inline", label: "Inline", code: POPOUT_CHAT_INLINE_SOURCE },
      { key: "overlay", label: "Overlay", code: POPOUT_CHAT_OVERLAY_SOURCE },
    ],
    []
  );

  return (
    <div>
      <CodeToggleExample
        variants={variants}
        initially={mode}
        initialView="code"
        showPreview={false}
        previewPlacement="below"
        value={mode}
        onChangeKey={(k) => setMode(k as "inline" | "overlay")}
      />
      <div className="mt-3" style={{ height: 600 }}>
        <PopoutChatExample mode={mode} />
      </div>
    </div>
  );
}
