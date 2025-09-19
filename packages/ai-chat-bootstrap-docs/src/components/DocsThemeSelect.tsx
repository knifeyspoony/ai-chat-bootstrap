"use client";

import { Monitor, Moon, Palette, Sun } from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  STORAGE_KEY,
  THEME_EVENT,
  THEME_META,
  THEME_ORDER,
  type AppliedTheme,
  type ThemeChangeDetail,
  type ThemeChoice,
  isThemeChoice,
} from "./theme/theme-utils";

const ICON_MAP: Record<ThemeChoice, ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
  "solar-dusk": Palette,
  "solar-dusk-dark": Palette,
};

function applyThemeToDom(mode: AppliedTheme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const body = document.body;

  root.classList.remove("solar-dusk", "solar-dusk-dark");
  if (body) {
    body.classList.remove("solar-dusk", "solar-dusk-dark");
  }

  if (mode === "solar-dusk") {
    root.classList.add("solar-dusk");
    body?.classList.add("solar-dusk");
  } else if (mode === "solar-dusk-dark") {
    root.classList.add("solar-dusk-dark");
    body?.classList.add("solar-dusk-dark");
  }

  const isDark = mode === "dark" || mode === "solar-dusk-dark";
  root.classList.toggle("dark", isDark);
  body?.classList.toggle("dark", isDark);

  root.setAttribute("data-theme", isDark ? "dark" : "light");
}

function readAppliedFromDom(): AppliedTheme {
  if (typeof document === "undefined") return "light";
  const root = document.documentElement;
  if (root.classList.contains("solar-dusk-dark")) return "solar-dusk-dark";
  if (root.classList.contains("solar-dusk")) return "solar-dusk";
  if (root.classList.contains("dark")) return "dark";
  return "light";
}

export function DocsThemeSelect() {
  const [mounted, setMounted] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeChoice>("system");
  const [appliedTheme, setAppliedTheme] = useState<AppliedTheme>("light");
  const systemCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isThemeChoice(stored)) {
        setSelectedTheme(stored);
        return;
      }
    } catch {
      /* ignore storage read */
    }
    // No stored value – still apply whatever the DOM currently reflects (initial load).
    setAppliedTheme(readAppliedFromDom());
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    // Clear previous system listener if present.
    if (systemCleanupRef.current) {
      systemCleanupRef.current();
      systemCleanupRef.current = null;
    }

    const dispatchChange = (detail: ThemeChangeDetail) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent<ThemeChangeDetail>(THEME_EVENT, { detail }));
      }
    };

    if (selectedTheme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const updateFromSystem = () => {
        const mode: AppliedTheme = media.matches ? "dark" : "light";
        setAppliedTheme(mode);
        applyThemeToDom(mode);
        dispatchChange({ selected: "system", applied: mode });
      };
      updateFromSystem();
      media.addEventListener("change", updateFromSystem);
      systemCleanupRef.current = () => media.removeEventListener("change", updateFromSystem);
    } else {
      const mode = (selectedTheme === "dark" ? "dark" : selectedTheme) as AppliedTheme;
      setAppliedTheme(mode);
      applyThemeToDom(mode);
      dispatchChange({ selected: selectedTheme, applied: mode });
    }

    try {
      localStorage.setItem(STORAGE_KEY, selectedTheme);
    } catch {
      /* ignore storage write */
    }

    return () => {
      if (systemCleanupRef.current && selectedTheme === "system") {
        systemCleanupRef.current();
        systemCleanupRef.current = null;
      }
    };
  }, [selectedTheme, mounted]);

  const Icon = useMemo(() => ICON_MAP[selectedTheme], [selectedTheme]);

  return (
    <div className="relative inline-flex items-center text-sm">
      <Icon aria-hidden className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--muted-foreground)]" />
      <select
        aria-label="Select theme"
        value={selectedTheme}
        onChange={(event) => setSelectedTheme(event.target.value as ThemeChoice)}
        className="appearance-none rounded-md border border-[var(--border)] bg-[var(--background)] py-1.5 pl-8 pr-8 text-sm font-medium text-[var(--foreground)] shadow-sm transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in oklab,var(--primary) 45%,transparent)]"
      >
        {THEME_ORDER.map((option) => (
          <option key={option} value={option}>
            {THEME_META[option].label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 inline-flex h-4 w-4 items-center justify-center text-[var(--muted-foreground)]">
        ▾
      </span>
      <span className="sr-only">Current theme: {THEME_META[selectedTheme].label}; applied palette: {THEME_META[appliedTheme as ThemeChoice]?.label ?? appliedTheme}</span>
    </div>
  );
}
