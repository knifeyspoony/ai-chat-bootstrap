import { createAzure } from '@ai-sdk/azure'
import { streamText, tool, convertToModelMessages } from 'ai'
import { jsonSchema } from '@ai-sdk/provider-utils'
import type { ChatRequest } from '@lib/types/chat'

// Configure Azure OpenAI (users will need to set these env vars)
const azure = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME ?? 'your-resource',
  apiKey: process.env.AZURE_API_KEY ?? 'your-api-key',
  apiVersion: process.env.AZURE_API_VERSION ?? 'preview'
})

const model = azure(process.env.AZURE_DEPLOYMENT_ID ?? 'gpt-4.1')


export async function POST(req: Request) {
  try {
    const { messages, context, tools, focus, systemPrompt }: ChatRequest = await req.json()

    // Deserialize tools from frontend
    const deserializedTools = tools?.reduce((acc, serializedTool) => {
      acc[serializedTool.name] = tool({
        description: serializedTool.description,
        inputSchema: jsonSchema(serializedTool.inputSchema) as any,
        // Note: execute functions are handled on frontend
      })
      return acc
    }, {} as Record<string, any>) || {}
    
    // Build system message with context, focus, and tools
    const systemMessageParts = ['You are a helpful AI assistant integrated with a React application.']
    
    // Add tool information
    if (Object.keys(deserializedTools).length > 0) {
      systemMessageParts.push(`\nAvailable Tools:`)
      Object.entries(deserializedTools).forEach(([name, toolDef]) => {
        systemMessageParts.push(`- ${name}: ${toolDef.description}`)
      })
    }
    
    // Add context information
    if (context && Object.keys(context).length > 0) {
      systemMessageParts.push(`\nCurrent Application Context:`)
      systemMessageParts.push(JSON.stringify(context, null, 2))
    }
    
    // Add focus information
    if (focus && focus.length > 0) {
      systemMessageParts.push(`\nFocused Items (full objects):`)
      systemMessageParts.push(JSON.stringify(focus, null, 2))
    }
    
    systemMessageParts.push(`\nYou can use available tools to help users accomplish their tasks and interact with the UI elements they're focusing on. Be helpful and demonstrate the power of AI-app integration.`)
    
    const defaultSystemMessage = systemMessageParts.join('\n')
    
    const finalSystemMessage = systemPrompt || defaultSystemMessage

    console.log(`Final system message: ${finalSystemMessage}`)

    // Convert UI messages to model messages format
    const modelMessages = convertToModelMessages(messages, { ignoreIncompleteToolCalls: true})
    
    const result = await streamText({
      model,
      messages: [
        { role: 'system', content: finalSystemMessage },
        ...modelMessages
      ],
      tools: deserializedTools,
      temperature: 0.7,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}