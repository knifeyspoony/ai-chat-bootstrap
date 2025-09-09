"use client";
import { Code2Icon, CopyIcon, PlayIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { highlightToHtml } from "../lib/shiki";

interface LiveCodeExampleProps {
  code: string;
  children: React.ReactNode; // The live preview
  initially?: "preview" | "code";
  language?: string;
  className?: string;
}

export function LiveCodeExample({
  code,
  children,
  initially = "preview",
  language = "tsx",
  className,
}: LiveCodeExampleProps) {
  const [mode, setMode] = useState<"preview" | "code">(initially);
  const [copied, setCopied] = useState(false);
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const out = await highlightToHtml(code, language);
        if (cancelled) return;

        // Extract background color from the generated HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(out, "text/html");
        const preElement = doc.querySelector("pre");
        if (preElement) {
          const computedStyle = preElement.getAttribute("style") || "";
          const bgMatch = computedStyle.match(/background-color:\s*([^;]+)/);
          if (bgMatch) {
            setBackgroundColor(bgMatch[1].trim());
          }
        }

        setHtml(out);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Highlight failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className={"example-frame " + (className || "")}>
      <div className="flex items-center justify-between">
        <div className="example-toggle-buttons">
          <button
            type="button"
            data-active={mode === "preview"}
            onClick={() => setMode("preview")}
            aria-label="Show live preview"
          >
            <PlayIcon className="inline h-3.5 w-3.5 mr-1" /> Preview
          </button>
          <button
            type="button"
            data-active={mode === "code"}
            onClick={() => setMode("code")}
            aria-label="Show source code"
          >
            <Code2Icon className="inline h-3.5 w-3.5 mr-1" /> Code
          </button>
        </div>
        <button
          onClick={copy}
          className="text-xs inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-muted"
        >
          <CopyIcon className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="relative min-h-24 rounded-md border bg-background">
        {mode === "preview" ? (
          <div>{children}</div>
        ) : error ? (
          <pre className="m-0 p-3 text-xs text-red-500 overflow-x-auto">
            {error}
          </pre>
        ) : loading && !html ? (
          <div className="p-3 text-xs text-muted-foreground">Highlighting…</div>
        ) : (
          <div
            className="shiki p-2 rounded-md text-sm overflow-x-auto"
            style={{ backgroundColor }}
            dangerouslySetInnerHTML={{ __html: html || "" }}
          />
        )}
      </div>
    </div>
  );
}
