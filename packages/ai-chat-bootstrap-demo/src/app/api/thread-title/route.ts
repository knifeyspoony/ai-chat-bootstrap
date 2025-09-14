import { createAzure } from "@ai-sdk/azure";
import type { UIMessage } from "ai";
import { generateObject } from "ai";
import { z } from "zod";

// Reuse Azure config like the chat route
const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME ?? "your-resource",
  apiKey: process.env.AZURE_API_KEY ?? "your-api-key",
  apiVersion: process.env.AZURE_API_VERSION ?? "preview",
});

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

function fallbackTitle(messages: UIMessage[]): string | undefined {
  const firstUser = messages.find((m) => m.role === "user");
  const txt = firstUser ? extractTextFromMessages([firstUser]) : "";
  if (!txt) return undefined;
  // Simple heuristic: sentence up to 6 words
  const words = txt.replace(/\s+/g, " ").trim().split(" ");
  const title = words.slice(0, 8).join(" ");
  return sanitizeTitle(title);
}

function sanitizeTitle(s: string): string {
  // Remove quotes and trailing punctuation, clamp length
  let t = s.replace(/^\s*['"`]|['"`]\s*$/g, "").trim();
  t = t.replace(/[\n\r]+/g, " ").replace(/\s+/g, " ");
  if (t.length > 60) t = t.slice(0, 60).replace(/\s+\S*$/, "");
  return t || "Untitled thread";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      messages?: UIMessage[];
      previousTitle?: string;
    };
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const previousTitle =
      typeof body?.previousTitle === "string" ? body.previousTitle : undefined;

    // If no provider configured, return a deterministic fallback
    const hasAzureCreds =
      !!process.env.AZURE_RESOURCE_NAME &&
      !!process.env.AZURE_API_KEY &&
      !!process.env.AZURE_DEPLOYMENT_ID;

    if (!hasAzureCreds) {
      const title = fallbackTitle(messages) ?? "Untitled thread";
      return new Response(JSON.stringify({ title }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // dump messages for debugging in json
    console.log(
      "Generating thread title for messages:",
      JSON.stringify(messages)
    );
    const excerpt = extractTextFromMessages(messages);
    console.log("Excerpt to summarize:", excerpt);
    const ThreadTitleSchema = z.object({
      thread_title: z.string().min(1).max(120),
    });

    const result = await generateObject({
      model,
      schema: ThreadTitleSchema,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `
          # Persona
          
          You are an expert in summarization. 
          
          ## Task
          
          You generate short, descriptive chat thread titles based on recent chat history to help users recognize previous conversations 
          in a thread list based on the subject of the conversation. Remember - you are NOT summarizing THIS conversation, rather the excerpt only!
          
          ## Requirements
          
          Consider the messages in the excerpt we will provide you. 
          Keep your summary title to 3-8 words, no quotes, no trailing punctuation. Prefer clarity over cleverness.
          For example, "Vacation ideas in Europe" is good, "Chat with user" is clearly very bad. 
          
          ## Previous Title

          ${
            previousTitle
              ? `The current title of the thread is ${previousTitle}.`
              : "There is no existing title for this thread."
          }
          
          ## Excerpt

          Here is the recent conversation excerpt we extracted from the thread:

          ### BEGIN CHAT EXCERPT TO SUMMARIZE
          
          ${excerpt ? excerpt : "[No recent messages]"}

          ### END CHAT EXCERPT TO SUMMARIZE

          ## Output

          Now, provide a concise thread title that summarizes the topic of the excerpt.
          `,
        },
      ],
    });

    const title = sanitizeTitle(result.object.thread_title);
    return new Response(JSON.stringify({ title }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // On error, provide a safe fallback
    try {
      const body = (await req.json()) as { messages?: UIMessage[] };
      const fallback = fallbackTitle(body?.messages ?? []);
      return new Response(
        JSON.stringify({ title: fallback ?? "Untitled thread" }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch {
      return new Response(JSON.stringify({ title: "Untitled thread" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }
}
