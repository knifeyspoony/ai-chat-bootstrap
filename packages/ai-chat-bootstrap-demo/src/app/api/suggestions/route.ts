import { createAzure } from '@ai-sdk/azure'
import { generateObject } from 'ai'
import { z } from 'zod'
import type { SuggestionsRequest, SuggestionsResponse, UIMessage } from 'ai-chat-bootstrap'

// Configure Azure OpenAI (users will need to set these env vars)
const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME ?? 'your-resource',
  apiKey: process.env.AZURE_API_KEY ?? 'your-api-key',
  apiVersion: process.env.AZURE_API_VERSION ?? 'preview'
})

const model = azure(process.env.AZURE_DEPLOYMENT_ID ?? 'gpt-4.1')

// Schema for AI to generate structured suggestions
const SuggestionsSchema = z.object({
  suggestions: z.array(z.object({
    reasoning: z.string().describe('Internal reasoning about why this suggestion makes sense in context'),
    shortSuggestion: z.string().describe('Short, clickable text (2-5 words) for the suggestion button'),
    longSuggestion: z.string().describe('Complete, actionable user message that will be sent when clicked')
  })).min(3).max(5)
})

export async function POST(req: Request) {
  try {
    const { messages, context, focus, prompt }: SuggestionsRequest = await req.json()

    // Build context for AI to understand the conversation state
    const systemMessageParts = [
      'You are an AI assistant that generates contextual suggestions for continuing a conversation.',
      'Analyze the conversation history, context, and focus items to suggest relevant next steps.',
      '',
      'Guidelines for suggestions:',
      '- Make suggestions that build naturally on the conversation',
      '- Consider the application context and focused items',
      '- shortSuggestion: 2-5 words for button text (e.g., "Add validation", "Fix styling")',
      '- longSuggestion: Complete message user would send (e.g., "Please add form validation to check for required fields")',
      '- reasoning: Explain why this suggestion is relevant',
      '- Generate 3-5 suggestions that offer different directions',
      '- Prioritize actionable, specific suggestions over generic ones'
    ]

    // Add custom prompt if provided
    if (prompt) {
      systemMessageParts.push('', 'Additional guidance:', prompt)
    }

    // Add context information
    if (context && Object.keys(context).length > 0) {
      systemMessageParts.push('', 'Current Application Context:')
      systemMessageParts.push(JSON.stringify(context, null, 2))
    }

    // Add focus information
    if (focus && focus.length > 0) {
      systemMessageParts.push('', 'Focused Items:')
      systemMessageParts.push(JSON.stringify(focus, null, 2))
    }

    const systemMessage = systemMessageParts.join('\n')

    // Create conversation context from messages
    const conversationHistory = messages.map((msg: UIMessage) => {
      const content = msg.parts?.map(part => {
        switch (part.type) {
          case 'text':
            return part.text
          case 'reasoning':
            return `[Reasoning: ${part.text}]`
          case 'tool-':
            return `[Tool used: ${part.type}]`
          default:
            return `[${part.type}]`
        }
      }).join(' ') || ''
      
      return `${msg.role}: ${content}`
    }).join('\n')

    const userPrompt = `Based on this conversation, generate contextual suggestions for what the user might want to do next:

${conversationHistory}

Generate suggestions that feel natural and helpful for continuing this conversation.`

    const result = await generateObject({
      model,
      schema: SuggestionsSchema,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8, // Slightly higher temperature for creative suggestions
    })

    const response: SuggestionsResponse = {
      suggestions: result.object.suggestions
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Suggestions API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate suggestions' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}