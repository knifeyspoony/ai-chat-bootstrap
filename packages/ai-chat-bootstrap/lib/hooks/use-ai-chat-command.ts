import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAIChatCommandsStore, type AIChatCommand } from '../stores/commands'

/**
 * Register AI chat commands that send targeted messages to the LLM.
 * These commands are executed by the AI using specific frontend tools.
 * 
 * @param command - The AI chat command configuration (type is automatically set to 'ai')
 * 
 * @example
 * ```tsx
 * function MyCommands() {
 *   useAIChatCommand({
 *     name: 'summarize',
 *     description: 'Summarize a URL using AI',
 *     toolName: 'url_summarizer',
 *     parameters: z.object({
 *       url: z.string().describe('URL to summarize')
 *     }),
 *     systemPrompt: 'You are a concise summarizer. Extract key points and main ideas.'
 *   })
 *   
 *   useAIChatCommand({
 *     name: 'search',
 *     description: 'Search and analyze content',
 *     toolName: 'web_search',
 *     parameters: z.object({
 *       query: z.string().describe('Search query')
 *     })
 *   })
 * }
 * ```
 */
export function useAIChatCommand(command: Omit<AIChatCommand, 'type'>) {
  // SINGLE Zustand call to minimize hook count
  const { registerCommand, unregisterCommand } = useAIChatCommandsStore(useShallow(state => ({
    registerCommand: state.registerCommand,
    unregisterCommand: state.unregisterCommand
  })))
  
  // Use single ref for all command data to minimize hook count  
  const commandDataRef = useRef<{
    command: AIChatCommand
    signature: string
  }>({
    command: { ...command, type: 'ai' },
    signature: JSON.stringify({
      name: command.name,
      description: command.description,
      parameters: command.parameters,
      type: 'ai',
      toolName: command.toolName,
      systemPrompt: command.systemPrompt
    })
  })
  
  // Update refs (no additional hooks)
  const currentSignature = JSON.stringify({
    name: command.name,
    description: command.description,
    parameters: command.parameters,
    type: 'ai',
    toolName: command.toolName,
    systemPrompt: command.systemPrompt
  })
  
  const hasSignatureChanged = commandDataRef.current.signature !== currentSignature
  commandDataRef.current.command = { ...command, type: 'ai' }
  
  useEffect(() => {
    const stableCommand: AIChatCommand = {
      type: 'ai',
      name: command.name,
      description: command.description,
      parameters: command.parameters,
      toolName: command.toolName,
      systemPrompt: command.systemPrompt
    }
    
    registerCommand(stableCommand)
    commandDataRef.current.signature = currentSignature
    
    return () => {
      unregisterCommand(command.name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command.name, hasSignatureChanged, currentSignature])
}