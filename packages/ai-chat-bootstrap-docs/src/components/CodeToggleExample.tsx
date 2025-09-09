"use client";
import { Code2Icon, CopyIcon, PlayIcon } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { highlightToHtml } from "../lib/shiki";

type Variant = {
  key: string;
  label: string;
  code: string;
};

interface CodeToggleExampleProps {
  variants: Variant[];
  initially?: string; // initial variant key
  initialView?: "preview" | "code";
  language?: string;
  className?: string;
  renderPreview?: (activeKey: string) => React.ReactNode;
  showPreview?: boolean; // when false, only show code; preview (if provided) may be rendered below
  previewPlacement?: "inside" | "below";
  // Controlled active key (optional). If provided, the component becomes controlled.
  value?: string;
  onChangeKey?: (key: string) => void;
}

export function CodeToggleExample({
  variants,
  initially,
  initialView = "preview",
  language = "tsx",
  className,
  renderPreview,
  showPreview = true,
  previewPlacement = "inside",
  value,
  onChangeKey,
}: CodeToggleExampleProps) {
  const initialKey = initially ?? variants[0]?.key ?? "default";
  const [uncontrolledKey, setUncontrolledKey] = useState<string>(initialKey);
  const activeKey = value ?? uncontrolledKey;
  const [view, setView] = useState<"preview" | "code">(initialView);
  const [copied, setCopied] = useState(false);
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>("");

  const activeVariant = useMemo(
    () => variants.find((v) => v.key === activeKey) ?? variants[0],
    [variants, activeKey]
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const out = await highlightToHtml(activeVariant?.code ?? "", language);
        if (cancelled) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(out, "text/html");
        const preElement = doc.querySelector("pre");
        if (preElement) {
          const computedStyle = preElement.getAttribute("style") || "";
          const bgMatch = computedStyle.match(/background-color:\s*([^;]+)/);
          if (bgMatch) setBackgroundColor(bgMatch[1].trim());
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
  }, [activeVariant, language]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(activeVariant?.code ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  const shouldShowPreviewInside =
    showPreview && previewPlacement === "inside" && !!renderPreview;
  // Allow rendering preview below even when showPreview is false (code-only UI controlling a separate live demo)
  const shouldRenderPreviewBelow =
    previewPlacement === "below" && !!renderPreview;

  return (
    <div className={"example-frame " + (className || "")}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="example-toggle-buttons">
          {variants.map((v) => (
            <button
              key={v.key}
              type="button"
              data-active={activeKey === v.key}
              onClick={() => {
                if (value !== undefined) {
                  onChangeKey?.(v.key);
                } else {
                  setUncontrolledKey(v.key);
                }
              }}
              aria-label={`Show ${v.label} variant`}
            >
              {v.label}
            </button>
          ))}
        </div>
        {showPreview && (
          <div className="example-toggle-buttons">
            <button
              type="button"
              data-active={view === "preview"}
              onClick={() => setView("preview")}
              aria-label="Show live preview"
            >
              <PlayIcon className="inline h-3.5 w-3.5 mr-1" /> Preview
            </button>
            <button
              type="button"
              data-active={view === "code"}
              onClick={() => setView("code")}
              aria-label="Show source code"
            >
              <Code2Icon className="inline h-3.5 w-3.5 mr-1" /> Code
            </button>
          </div>
        )}
        <button
          onClick={copy}
          className="text-xs inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-muted"
        >
          <CopyIcon className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="relative min-h-24 rounded-md border bg-background">
        {shouldShowPreviewInside && view === "preview" ? (
          <div>{renderPreview!(activeKey)}</div>
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

      {shouldRenderPreviewBelow && (
        <div className="mt-3">{renderPreview!(activeKey)}</div>
      )}
    </div>
  );
}
