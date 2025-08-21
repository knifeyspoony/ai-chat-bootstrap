import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAIContextStore, useAIToolsStore, useAIFocusStore } from '@lib/stores'

/**
 * Enhanced chat hook that integrates with AI SDK and our Zustand stores.
 * Automatically includes context and handles tool execution.
 */
export function useAIChat(options: {
  api?: string
  systemPrompt?: string
  onToolCall?: (toolCall: any) => void
} = {}) {
  const { api = '/api/chat', systemPrompt, onToolCall } = options
  
  // Get raw store data with stable selectors - these return the same reference when unchanged
  const contextMap = useAIContextStore(useShallow(state => state.context))
  const toolsMap = useAIToolsStore(useShallow(state => state.tools))
  const focusItemsMap = useAIFocusStore(useShallow(state => state.focusItems))
  const executeTool = useAIToolsStore(state => state.executeTool)
  
  // Note: Removed chat store sync to prevent infinite re-renders
  
  // Get focus items - they're already serializable
  const focusItems = useMemo(() => {
    return Array.from(focusItemsMap.values())
  }, [focusItemsMap])
  
  // Cache serialized data - only recompute when raw store data changes
  const context = useMemo(() => {
    return Object.fromEntries(contextMap.entries())
  }, [contextMap])
  
  const tools = useMemo(() => {
    return Array.from(toolsMap.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters // This will need to be converted to JSON Schema in the transport
    }))
  }, [toolsMap])
  
  
  // Memoize available tools to avoid creating new array in return
  const availableTools = useMemo(() => {
    return Array.from(toolsMap.values())
  }, [toolsMap])
  
  // Create transport with dynamic request preparation - only recreate when api/systemPrompt changes
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api,
      prepareSendMessagesRequest: (options) => {
        // Get fresh store data for each request - called only when sending messages
        const currentContext = useAIContextStore.getState().serialize()
        const currentTools = useAIToolsStore.getState().serializeToolsForBackend()
        const currentFocusItems = useAIFocusStore.getState().getAllFocusItems()
        
        return {
          ...options,
          body: {
            ...options.body,
            messages: options.messages,
            context: currentContext,
            tools: currentTools,
            focus: currentFocusItems, // Send complete focus items
            systemPrompt
          }
        }
      }
    })
  }, [api, systemPrompt])
  
  const chatHook = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: async ({ toolCall }) => {
      try {
        // Execute frontend tool if available
        const result = await executeTool(toolCall.toolName, toolCall.input)
        onToolCall?.(toolCall)
        // Add the tool result to the chat stream and still return it
        addToolResultForCall(toolCall, result)

        return result
      } catch (error) {
        console.error('Tool execution error:', error)
        throw error
      }
    },
    onFinish: () => {
      // Hook handles loading state internally
    },
    onError: (error) => {
      console.error('Chat error:', error)
    }
  })
  
  // Note: Removed chat store sync - causes infinite re-renders
  // The chat hook manages its own state internally
  
  // Helper to attach tool results to the chat
  function addToolResultForCall(
    toolCall: { toolName: string; toolCallId: string; input: unknown },
    output: unknown
  ) {
    try {
      chatHook.addToolResult({
        tool: toolCall.toolName as any,
        toolCallId: toolCall.toolCallId,
        output: output as any
      })
    } catch (e) {
      console.error('addToolResult error:', e)
    }
  }

  // Enhanced sendMessage - the transport handles all dynamic data injection
  const sendMessageWithContext = (content: string) => {
    chatHook.sendMessage({ text: content })
  }
  
  return {
    ...chatHook,
    sendMessageWithContext,
    isLoading: chatHook.status === 'streaming' || chatHook.status === 'submitted',
    // Expose cached reactive store state for components that need it
    context,
    availableTools,
    tools,
    focusItems
  }
}