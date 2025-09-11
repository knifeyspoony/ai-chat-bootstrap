import type { ContextItem, FocusItem } from "../types/chat";

export interface BuildEnrichedSuggestionsPromptParams {
  originalSystemPrompt?: string;
  context?: ContextItem[];
  focus?: FocusItem[];
  tools?: { name: string; description?: string }[];
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
      const label = c.label || c.id;
      const desc = c.description ?? "";
      const dataStr = c.data
        ? `\nData: ${JSON.stringify(c.data, null, 2)}`
        : "";
      lines.push(
        `- **${label}**${desc ? ": " + desc : ""}${
          c.priority !== undefined ? ` (priority ${c.priority})` : ""
        }${dataStr}`
      );
    });
    lines.push("");
  }

  if (focus.length > 0) {
    lines.push(
      "## Focus\nThe user currently has specific items selected / highlighted that may be highly relevant to the immediate task. Prioritize alignment with these when crafting suggestions.\n"
    );
    focus.forEach((f) => {
      const label = f.label || f.id;
      const desc = f.description ?? "";
      const dataStr = f.data
        ? `\nData: ${JSON.stringify(f.data, null, 2)}`
        : "";
      lines.push(`- **${label}**${desc ? ": " + desc : ""}${dataStr}`);
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
