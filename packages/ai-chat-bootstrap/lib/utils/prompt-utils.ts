import type { ContextItem, FocusItem } from "../types/chat";
import { compressLines, estimateTokens } from "./token-utils";

export interface BuildEnrichedSystemPromptParams {
  originalSystemPrompt?: string;
  context?: ContextItem[];
  focus?: FocusItem[];
  tools?: { name: string; description?: string }[];
  maxTokens?: number; // soft budget for entire enriched prompt
  maxListItems?: number; // initial cap before adaptive trim
  hardMaxTokens?: number; // emergency cut-off if still exceeded
}

/**
 * Build an enriched system prompt that:
 *  - Adds a standardized preamble describing enhanced chat capabilities
 *  - Conditionally includes sections ONLY when data is present
 *  - Provides short explanatory paragraphs (no full raw JSON payloads)
 *  - Enumerates tool names and descriptions (no parameter schemas)
 *  - Appends the ORIGINAL system prompt verbatim at the end
 *
 * Section order (only rendered if data present):
 *  Header / Preamble
 *  Tools
 *  Context
 *  Focus
 *  Divider + Original System Prompt
 *
 * Precedence on the backend:
 *  enrichedSystemPrompt (if supplied) > systemPrompt (legacy) > backend fallback
 */
export function buildEnrichedSystemPrompt(
  params: BuildEnrichedSystemPromptParams
): string {
  const {
    originalSystemPrompt,
    context = [],
    focus = [],
    tools = [],
    maxTokens = 12000,
    hardMaxTokens = 24000,
    maxListItems = 50,
  } = params;

  const lines: string[] = [];

  // Always start with a concise capability declaration (markdown heading).
  lines.push(
    "# Enhanced Chat System\n",
    "You are an assistant who operates within an application that can optionally provide structured application context, user focus selections, and callable tools. Use these capabilities to give more accurate, grounded, and actionable responses.\n"
  );

  // Priority sort context items if priority provided
  const sortedContext = [...context].sort((a, b) => {
    const pa = a.priority ?? 0;
    const pb = b.priority ?? 0;
    return pb - pa; // higher first
  });

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
      "## Focus\nThe user currently has specific items selected / highlighted that may be highly relevant to the immediate task. Prioritize alignment with these when crafting responses or deciding tool usage.\n"
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

  // Adaptive token budgeting
  let tokens = estimateTokens(result);
  if (tokens > maxTokens) {
    // Strategy: progressively reduce list sections before coarse truncation.
    // We'll rebuild lines for adjustable sections.
    const rebuild = () => result.split(/\n/);
    let lineArr = rebuild();

    const shrinkSection = (header: string, minKeep = 5) => {
      const startIdx = lineArr.findIndex((l) => l.startsWith(header));
      if (startIdx === -1) return;
      // Find next header (## ) or end
      let endIdx = lineArr.length;
      for (let i = startIdx + 1; i < lineArr.length; i++) {
        if (/^##\s+/.test(lineArr[i])) {
          endIdx = i;
          break;
        }
      }
      const sectionLines = lineArr.slice(startIdx, endIdx);
      // Leave header + maybe description + compress remainder bullet list
      const bulletIdx = sectionLines.findIndex((l) => l.startsWith("- ")); // first bullet
      if (bulletIdx === -1) return; // nothing to compress
      const head = sectionLines.slice(0, bulletIdx);
      const bullets = sectionLines
        .slice(bulletIdx)
        .filter((l) => l.startsWith("- "));
      if (bullets.length <= minKeep + 4) return; // already small
      const compressed = compressLines({
        lines: bullets,
        keepHead: minKeep,
        keepTail: 2,
      });
      lineArr = [
        ...lineArr.slice(0, startIdx),
        ...head,
        ...compressed,
        ...lineArr.slice(endIdx),
      ];
    };

    // Pass 1: compress context (likely largest)
    shrinkSection("## Context", 10);
    result = lineArr.join("\n");
    tokens = estimateTokens(result);

    // Pass 2: compress tools if still heavy
    if (tokens > maxTokens) {
      lineArr = rebuild();
      shrinkSection("## Tools", 8);
      result = lineArr.join("\n");
      tokens = estimateTokens(result);
    }

    // Pass 3: compress focus
    if (tokens > maxTokens) {
      lineArr = rebuild();
      shrinkSection("## Focus", 8);
      result = lineArr.join("\n");
      tokens = estimateTokens(result);
    }

    // Final safeguard hard truncate tokens (approx via char proportion)
    if (tokens > hardMaxTokens) {
      const ratio = hardMaxTokens / tokens;
      const targetChars = Math.floor(result.length * ratio) - 20;
      if (originalSystemPrompt) {
        // Keep last portion (likely includes original system prompt) and beginning
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
