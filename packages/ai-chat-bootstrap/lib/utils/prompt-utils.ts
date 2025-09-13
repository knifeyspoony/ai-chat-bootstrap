import type { ContextItem, FocusItem } from "../types/chat";

export interface BuildEnrichedSystemPromptParams {
  originalSystemPrompt?: string;
  context?: ContextItem[];
  focus?: FocusItem[];
  tools?: { name: string; description?: string }[];
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
  const { originalSystemPrompt, context = [], focus = [], tools = [] } = params;

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
    tools.forEach((t) => {
      lines.push(`- **${t.name}**: ${t.description ?? ""}`);
    });
    lines.push("");
  }

  if (sortedContext.length > 0) {
    lines.push(
      "## Context\nThe application has supplied contextual items that may inform intent, constraints, domain specifics, or user/environment state. Treat them as background grounding signals when interpreting the user's messages.\n"
    );
    sortedContext.forEach((c) => {
      lines.push(`- ${c.text}${c.priority !== undefined ? ` (priority ${c.priority})` : ""}`);
    });
    lines.push("");
  }

  if (focus.length > 0) {
    lines.push(
      "## Focus\nThe user currently has specific items selected / highlighted that may be highly relevant to the immediate task. Prioritize alignment with these when crafting responses or deciding tool usage.\n"
    );
    focus.forEach((f) => {
      const label = f.label || f.id;
      const desc = f.description ?? "";
      lines.push(`- **${label}**${desc ? ": " + desc : ""}`);
    });
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

  return lines.join("\n");
}
