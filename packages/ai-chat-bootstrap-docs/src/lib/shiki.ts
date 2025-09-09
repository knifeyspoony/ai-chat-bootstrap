"use client";
import * as shiki from "shiki";

declare global {
  // Allow caching across HMR in dev
  var __acb_shikiHighlighter: Promise<shiki.Highlighter> | undefined;
}

const DEFAULT_THEMES = ["github-dark", "github-light"] as const;
const DEFAULT_LANGS = [
  "tsx",
  "typescript",
  "javascript",
  "ts",
  "js",
  "json",
  "bash",
  "shell",
  "css",
  "html",
  "markdown",
  "mdx",
] as const;

/**
 * Returns a cached Shiki highlighter instance. Ensures only one is created.
 * In dev, persists across HMR via a global to avoid multiple instances.
 */
export async function getShikiHighlighter() {
  if (!globalThis.__acb_shikiHighlighter) {
    globalThis.__acb_shikiHighlighter = shiki.createHighlighter({
      themes: [...DEFAULT_THEMES],
      langs: [...DEFAULT_LANGS],
    });
  }
  return globalThis.__acb_shikiHighlighter;
}

/**
 * Convenience helper to highlight code with our default themes.
 */
export async function highlightToHtml(code: string, lang: string) {
  const highlighter = await getShikiHighlighter();
  return highlighter.codeToHtml(code, {
    lang,
    themes: { dark: DEFAULT_THEMES[0], light: DEFAULT_THEMES[1] },
    defaultColor: "dark",
  });
}
