"use client";

import { MockChatContainer } from "ai-chat-bootstrap";
import { useEffect, useId, useState } from "react";

import { useMockAIChat } from "./shared/useMockAIChat";
import {
  isThemeChoice,
  STORAGE_KEY,
  THEME_EVENT,
  THEME_META,
  type AppliedTheme,
  type ThemeChangeDetail,
  type ThemeChoice,
} from "./theme/theme-utils";

const INITIAL_MESSAGES = [
  {
    id: "theme-demo-1",
    role: "assistant" as const,
    parts: [
      {
        type: "text" as const,
        text: "Welcome! Change the theme from the header to restyle the chat instantly.",
      },
    ],
  },
  {
    id: "theme-demo-2",
    role: "user" as const,
    parts: [
      {
        type: "text" as const,
        text: "How can I try other chat themes?",
      },
    ],
  },
  {
    id: "theme-demo-3",
    role: "assistant" as const,
    parts: [
      {
        type: "text" as const,
        text: 'Choose "Solar Light" or "Solar Dark" to apply the bundled warm gradients.',
      },
    ],
  },
];

function readAppliedThemeFromDom(): AppliedTheme {
  if (typeof document === "undefined") return "light";
  const root = document.documentElement;
  if (root.classList.contains("solar-dusk-dark")) return "solar-dusk-dark";
  if (root.classList.contains("solar-dusk")) return "solar-dusk";
  if (root.classList.contains("dark")) return "dark";
  return "light";
}

function readSelectedTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isThemeChoice(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "system";
}

export function ThemePlayground() {
  const chatId = useId();
  const [selectedTheme, setSelectedTheme] = useState<ThemeChoice>("system");
  const [appliedTheme, setAppliedTheme] = useState<AppliedTheme>("light");

  const chat = useMockAIChat({
    initialMessages: INITIAL_MESSAGES.map((message, index) => ({
      ...message,
      id: `${message.id}-${chatId}-${index}`,
    })),
    responseGenerator: (text) =>
      `Switch themes any time—palette changes cascade through tokens. (Echo: ${text})`,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromDom = (detail?: ThemeChangeDetail) => {
      if (detail) {
        setSelectedTheme(detail.selected);
        setAppliedTheme(detail.applied);
        return;
      }
      setSelectedTheme(readSelectedTheme());
      setAppliedTheme(readAppliedThemeFromDom());
    };

    syncFromDom();

    const handler = (event: Event) => {
      const custom = event as CustomEvent<ThemeChangeDetail>;
      syncFromDom(custom.detail);
    };

    const storageHandler = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        syncFromDom();
      }
    };

    window.addEventListener(THEME_EVENT, handler as EventListener);
    window.addEventListener("storage", storageHandler);

    return () => {
      window.removeEventListener(THEME_EVENT, handler as EventListener);
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
        <span className="rounded-full border border-[var(--border)] px-2 py-1">
          Selected: {THEME_META[selectedTheme].label}
        </span>
        <span className="rounded-full border border-[var(--border)] px-2 py-1">
          Applied palette:{" "}
          {THEME_META[appliedTheme as ThemeChoice]?.label ?? appliedTheme}
        </span>
        <span className="rounded-full border border-dashed border-[var(--border)] px-2 py-1">
          Use the header selector to change themes.
        </span>
      </div>
      <div className="h-[600px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
        <MockChatContainer
          chat={chat}
          header={{ title: "Demo Assistant", subtitle: "Theme-aware UI" }}
          ui={{
            placeholder: "Ask about theming...",
            classes: {
              messages: "bg-transparent",
            },
          }}
          assistantActions={{ copy: true, regenerate: true }}
        />
      </div>
    </div>
  );
}
