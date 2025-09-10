module.exports = `import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { SuggestionsSchema } from 'ai-chat-bootstrap/server';
import type { SuggestionsRequest, SuggestionsResponse } from 'ai-chat-bootstrap/server';

export async function POST(req: Request) {
  try {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY || 'demo-key' });
    const model = openai('gpt-4o-mini');
    const { prompt }: SuggestionsRequest = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Missing enriched suggestions prompt' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const result = await generateObject({
      model,
      schema: SuggestionsSchema,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Generate suggestions.' }
      ],
      temperature: 0.8
    });

    const response: SuggestionsResponse = { suggestions: result.object.suggestions };

    return new Response(JSON.stringify(response), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[suggestions-api] error', error);
    return new Response(JSON.stringify({ error: 'Failed to generate suggestions' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
`;
