import type { ContextItem, FocusItem } from "../types/chat";
import { compressLines, estimateTokens } from "./token-utils";

export interface BuildEnrichedSuggestionsPromptParams {
  originalSystemPrompt?: string;
  context?: ContextItem[];
  focus?: FocusItem[];
  tools?: { name: string; description?: string }[];
  maxTokens?: number;
  hardMaxTokens?: number;
  maxListItems?: number;
  numSuggestions?: number;
}

/**
 * Build an enriched prompt for suggestions generation (Markdown output).
 * Includes all relevant context, focus, tools, and original system prompt,
 * plus a preamble instructing the model to generate up to n suggestions.
 */
export function buildEnrichedSuggestionsPrompt(
  params: BuildEnrichedSuggestionsPromptParams
): string {
  const {
    originalSystemPrompt,
    context = [],
    focus = [],
    tools = [],
    maxTokens = 12000,
    hardMaxTokens = 24000,
    maxListItems = 50,
    numSuggestions = 3,
  } = params;

  const lines: string[] = [];

  // Enhanced chat system preamble
  lines.push(
    "# Enhanced Chat System\n",
    "You are an assistant who operates within an application that can optionally provide structured application context, user focus selections, and callable tools. Use these capabilities to give more accurate, grounded, and actionable responses.\n"
  );

  // Suggestions task
  lines.push(
    `## Suggestions Task\nGenerate up to **${numSuggestions}** actionable suggestions that could further the conversation and assist the user. Consider all provided context, user focus, and available tools. Each suggestion should be relevant, clear, and help the user move forward.\n`
  );

  const sortedContext = [...context].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
  );

  if (tools.length > 0) {
    lines.push(
      "## Tools\nThe following callable helpers may be relevant to assist the user. Invoke only when they clearly help advance the task.\n"
    );
    const toolItems = tools.slice(0, maxListItems);
    toolItems.forEach((t) => {
      lines.push(`- **${t.name}**: ${sanitizeOneLine(t.description)}`);
    });
    if (tools.length > toolItems.length) {
      lines.push(
        `- (+${
          tools.length - toolItems.length
        } more tools not listed to conserve space)`
      );
    }
    lines.push("");
  }

  if (sortedContext.length > 0) {
    lines.push(
      "## Context\nThe application has supplied contextual items that may inform intent, constraints, domain specifics, or user/environment state. Treat them as background grounding signals when interpreting the user's messages.\n"
    );
    const contextItems = sortedContext.slice(0, maxListItems);
    contextItems.forEach((c) => {
      const label = c.label || c.id;
      const desc = sanitizeOneLine(c.description) || "";
      lines.push(
        `- **${label}**${desc ? ": " + desc : ""}${
          c.priority !== undefined ? ` (priority ${c.priority})` : ""
        }`
      );
    });
    if (sortedContext.length > contextItems.length) {
      lines.push(
        `- (+${
          sortedContext.length - contextItems.length
        } more context items truncated)`
      );
    }
    lines.push("");
  }

  if (focus.length > 0) {
    lines.push(
      "## Focus\nThe user currently has specific items selected / highlighted that may be highly relevant to the immediate task. Prioritize alignment with these when crafting suggestions.\n"
    );
    const focusItems = focus.slice(0, maxListItems);
    focusItems.forEach((f) => {
      const label = f.label || f.id;
      const desc = sanitizeOneLine(f.description) || "";
      lines.push(`- **${label}**${desc ? ": " + desc : ""}`);
    });
    if (focus.length > focusItems.length) {
      lines.push(
        `- (+${focus.length - focusItems.length} more focus items truncated)`
      );
    }
    lines.push("");
  }

  if (originalSystemPrompt) {
    lines.push(
      "---\n",
      "## Original System Prompt (application-specific instructions start here):\n",
      originalSystemPrompt,
      ""
    );
  }

  let result = lines.join("\n");
  let tokens = estimateTokens(result);
  if (tokens > maxTokens) {
    const rebuild = () => result.split(/\n/);
    let arr = rebuild();

    const shrinkSection = (header: string, minKeep = 6) => {
      const startIdx = arr.findIndex((l) => l.startsWith(header));
      if (startIdx === -1) return;
      let endIdx = arr.length;
      for (let i = startIdx + 1; i < arr.length; i++) {
        if (/^##\s+/.test(arr[i])) {
          endIdx = i;
          break;
        }
      }
      const section = arr.slice(startIdx, endIdx);
      const bulletStart = section.findIndex((l) => l.startsWith("- "));
      if (bulletStart === -1) return;
      const bullets = section
        .slice(bulletStart)
        .filter((l) => l.startsWith("- "));
      if (bullets.length <= minKeep + 4) return;
      const compressed = compressLines({
        lines: bullets,
        keepHead: minKeep,
        keepTail: 2,
      });
      arr = [
        ...arr.slice(0, startIdx),
        ...section.slice(0, bulletStart),
        ...compressed,
        ...arr.slice(endIdx),
      ];
    };

    shrinkSection("## Context", 12);
    result = arr.join("\n");
    tokens = estimateTokens(result);
    if (tokens > maxTokens) {
      arr = rebuild();
      shrinkSection("## Tools", 8);
      result = arr.join("\n");
      tokens = estimateTokens(result);
    }
    if (tokens > maxTokens) {
      arr = rebuild();
      shrinkSection("## Focus", 8);
      result = arr.join("\n");
      tokens = estimateTokens(result);
    }
    if (tokens > hardMaxTokens) {
      const ratio = hardMaxTokens / tokens;
      const targetChars = Math.floor(result.length * ratio) - 20;
      if (originalSystemPrompt) {
        const headChars = Math.floor(targetChars * 0.5);
        const tailChars = targetChars - headChars;
        result = `${result.slice(
          0,
          headChars
        )}\n...\n[Hard truncated]\n...\n${result.slice(-tailChars)}`;
      } else {
        result = result.slice(0, targetChars) + "\n...[Hard truncated]";
      }
    }
  }

  return result;
}

function sanitizeOneLine(value?: string): string {
  if (!value) return "";
  return value
    .replace(/\s+/g, " ")
    .replace(/[\r\n]/g, " ")
    .trim()
    .slice(0, 400);
}
