import {
  COT_COMPLETE_CHAIN_TOOL_NAME,
  COT_START_CHAIN_TOOL_NAME,
  COT_START_STEP_TOOL_NAME,
} from "../types/chain-of-thought";
import type { ContextItem, FocusItem } from "../types/chat";
// Define the planning step status locally since it's still used in this context
type PlanningStepStatus = "completed" | "in_progress" | "pending" | "blocked";

export interface BuildEnrichedSystemPromptParams {
  originalSystemPrompt?: string;
  context?: ContextItem[];
  focus?: FocusItem[];
  tools?: { name: string; description?: string }[];
  chainOfThoughtEnabled?: boolean;
  chainOfThought?: {
    chainId?: string;
    title?: string;
    summary?: string;
    currentStepId?: string;
    steps: {
      id: string;
      title: string;
      detail?: string;
      status: PlanningStepStatus;
    }[];
    active?: boolean;
  };
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
    chainOfThoughtEnabled = false,
    chainOfThought,
  } = params;

  const lines: string[] = [];

  // Always start with a concise capability declaration (markdown heading).
  lines.push(
    "# Enhanced Chat System\n",
    "You are an assistant who operates within an application that can optionally provide structured application context, user focus selections, and callable tools. Use these capabilities to give more accurate, grounded, and actionable responses.\n"
  );

  if (chainOfThoughtEnabled) {
    lines.push(
      "## Chain of Thought\n",
      `
      If you expect to call multiple tools or perform a chain of actions, use chain-of-thought to break down your approach.
      
      1. Use ${COT_START_CHAIN_TOOL_NAME} to name your overall plan (what are you trying to accomplish?)
      2. Use ${COT_START_STEP_TOOL_NAME} before you take any action. Give the step a clear title and optionally a description.
      3. Execute tools in the step, and provide any relevant updates on progress and reasoning as needed.
      4. When you're moving on to another distinct step in the plan (e.g., your previous step informs some new action), create a new step again with ${COT_START_STEP_TOOL_NAME}.
      5. When you're satisfied that the plan is complete (or you need to interact with the user for further work), use ${COT_COMPLETE_CHAIN_TOOL_NAME} to finish.

      NOTE: If the task or user request is simple e.g., only involves a single tool call or a text response, you SHOULD NOT use chain-of-thought!\n`
    );
  }

  if (chainOfThought && chainOfThought.steps.length > 0) {
    lines.push(
      "## Active Chain of Thought\nThis is the current chain visible to the user. Keep the statuses in sync with your actual progress.\n"
    );

    const statusToken = (status: PlanningStepStatus) => {
      switch (status) {
        case "completed":
          return "[x]";
        case "in_progress":
          return "[~]";
        case "blocked":
          return "[!]";
        default:
          return "[ ]";
      }
    };

    chainOfThought.steps.forEach((step) => {
      const token = statusToken(step.status);
      const detail = step.detail ? ` — ${step.detail}` : "";
      const focusMarker =
        chainOfThought.currentStepId === step.id ? " (current step)" : "";
      lines.push(`${token} ${step.title}${focusMarker}${detail}`);
    });

    if (chainOfThought.summary) {
      lines.push("", `Summary: ${chainOfThought.summary}`, "");
    } else {
      lines.push("");
    }
  }

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
      lines.push(
        `- ${c.text}${
          c.priority !== undefined ? ` (priority ${c.priority})` : ""
        }`
      );
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
