import type { UIMessage } from "ai";
import { createThreadTitleHandler } from "ai-chat-bootstrap/server";
import { createAzureClient, hasAzureCredentials } from "@/server/azure";

// Reuse Azure config like the chat route
const azure = createAzureClient();

const model = azure(process.env.AZURE_DEPLOYMENT_ID ?? "gpt-4.1");

function extractTextFromMessages(sliceToSummarize: UIMessage[]): string {
  if (sliceToSummarize.length === 0) return "";
  const chunks: string[] = [];
  for (const m of sliceToSummarize) {
    if (!m.parts) continue;
    for (const p of m.parts) {
      if (p.type === "text" && typeof p.text === "string") {
        chunks.push(`${m.role}: ${p.text}`);
      }
    }
  }
  return chunks.join("\n").trim();
}

function sanitizeTitle(text: string): string {
  let t = text.replace(/^\s*['"`]|['"`]\s*$/g, "").trim();
  t = t.replace(/[\n\r]+/g, " ").replace(/\s+/g, " ");
  if (t.length > 60) t = t.slice(0, 60).replace(/\s+\S*$/, "");
  return t || "Untitled thread";
}

function fallbackTitle(messages: UIMessage[]): string | undefined {
  const excerpt = extractTextFromMessages(messages);
  if (!excerpt) return undefined;
  const words = excerpt.replace(/\s+/g, " ").trim().split(" ");
  return sanitizeTitle(words.slice(0, 8).join(" "));
}

const THREAD_TITLE_PROMPT = `
# Persona
You are an expert summarizer.

## Task
Create short, descriptive chat thread titles using the recent conversation excerpt. You are summarizing the excerpt only.

## Requirements
- 3-8 words
- No quotes or trailing punctuation
- Prefer clarity over cleverness

## Output
Return only the final title.
`.trim();

const hasAzureCreds =
  hasAzureCredentials() && !!process.env.AZURE_DEPLOYMENT_ID;

export const POST = createThreadTitleHandler({
  model: hasAzureCreds ? model : undefined,
  systemPrompt: THREAD_TITLE_PROMPT,
  fallback: fallbackTitle,
  buildGenerateOptions: ({
    messages,
    previousTitle,
  }: {
    messages: UIMessage[];
    previousTitle?: string;
  }) => {
    if (process.env.NODE_ENV !== "production") {
      const excerpt = extractTextFromMessages(messages);
      console.log("[thread-title] excerpt:", excerpt);
      console.log("[thread-title] previous title:", previousTitle);
    }
    return {};
  },
  onError: (error: unknown) => {
    console.error("Thread title API error:", error);
  },
});
