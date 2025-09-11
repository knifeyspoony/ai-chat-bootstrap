// Tailwind plugin to expose utilities for ai-chat-bootstrap CSS variable hooks.
// Consumers: import plugin from 'ai-chat-bootstrap/tailwind.plugin' and add to plugins.

import plugin from "tailwindcss/plugin";

const VARS = {
  // Message roles
  "msg-assistant-bg": "--acb-chat-message-assistant-bg",
  "msg-assistant-fg": "--acb-chat-message-assistant-fg",
  "msg-user-bg": "--acb-chat-message-user-bg",
  "msg-user-fg": "--acb-chat-message-user-fg",
  "msg-system-bg": "--acb-chat-message-system-bg",
  "msg-system-fg": "--acb-chat-message-system-fg",
  "msg-radius": "--acb-chat-message-radius",
  // Container/header/input
  "chat-bg": "--acb-chat-container-bg",
  "chat-border": "--acb-chat-container-border",
  "chat-radius": "--acb-chat-container-radius",
  "header-bg": "--acb-chat-header-bg",
  "header-fg": "--acb-chat-header-fg",
  "header-border": "--acb-chat-header-border",
  "input-wrapper-bg": "--acb-chat-input-wrapper-bg",
  "input-wrapper-border": "--acb-chat-input-wrapper-border",
  "prompt-bg": "--acb-prompt-bg",
  "prompt-fg": "--acb-prompt-fg",
  "prompt-border": "--acb-prompt-border",
  // Tool
  "tool-bg": "--acb-tool-bg",
  "tool-border": "--acb-tool-border",
  "tool-radius": "--acb-tool-radius",
  "tool-header-bg": "--acb-tool-header-bg",
  "tool-header-fg": "--acb-tool-header-fg",
  "tool-input-bg": "--acb-tool-input-bg",
  "tool-input-fg": "--acb-tool-input-fg",
  "tool-output-bg": "--acb-tool-output-bg",
  "tool-output-fg": "--acb-tool-output-fg",
  "tool-error-bg": "--acb-tool-error-bg",
  "tool-error-fg": "--acb-tool-error-fg",
  // Code
  "code-bg": "--acb-code-bg",
  "code-fg": "--acb-code-fg",
  "code-border": "--acb-code-border",
  "code-radius": "--acb-code-radius",
  "code-ln-fg": "--acb-code-line-number-fg",
  // Scrollbar
  "scrollbar-track": "--acb-scrollbar-track",
  "scrollbar-thumb": "--acb-scrollbar-thumb",
  "scrollbar-thumb-hover": "--acb-scrollbar-thumb-hover",
  // Reasoning
  "reasoning-fg": "--acb-reasoning-fg",
  "reasoning-icon": "--acb-reasoning-icon",
};

export default plugin(function ({ matchUtilities, theme }) {
  // Generic variable setter utilities: acb-[token]-[value]
  matchUtilities(
    Object.fromEntries(
      Object.entries(VARS).map(([short, varName]) => [
        `acb-${short}`,
        (value) => ({ [varName]: value }),
      ])
    ),
    { values: theme("colors") }
  );

  // Radius-specific utilities also accept spacing scale
  matchUtilities(
    {
      "acb-msg-radius": (value) => ({ "--acb-chat-message-radius": value }),
      "acb-code-radius": (value) => ({ "--acb-code-radius": value }),
      "acb-tool-radius": (value) => ({ "--acb-tool-radius": value }),
      "acb-chat-radius": (value) => ({ "--acb-chat-container-radius": value }),
    },
    { values: theme("borderRadius") }
  );
});
