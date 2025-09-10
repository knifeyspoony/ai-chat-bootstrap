module.exports = `import { streamText, convertToModelMessages } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { ChatRequest } from 'ai-chat-bootstrap/server';
import { deserializeFrontendTools } from 'ai-chat-bootstrap/server';

export async function POST(req: Request) {
  // Instantiate OpenAI client per-request (stateless, simple; adjust if you want to reuse)
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY || 'demo-key' });
  const model = openai('gpt-4o-mini');
  const { messages, tools, enrichedSystemPrompt }: ChatRequest = await req.json();

  if (!enrichedSystemPrompt) {
    return new Response(JSON.stringify({ error: 'Missing enrichedSystemPrompt' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const deserializedTools = deserializeFrontendTools(tools);

  const modelMessages = convertToModelMessages(messages, { ignoreIncompleteToolCalls: true });

  const result = await streamText({ model, messages: [ { role: 'system', content: enrichedSystemPrompt }, ...modelMessages ], tools: deserializedTools, temperature: 0.7 });

  return result.toUIMessageStreamResponse();
}
`;
