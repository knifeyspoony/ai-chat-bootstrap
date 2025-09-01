import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAIChatCommandsStore, type ChatCommand } from '@lib/stores/commands'

/**
 * Register chat commands that execute when users type '/' commands.
 * Handles command recreation gracefully without requiring users to memoize their command definitions.
 * 
 * @param command - The chat command configuration
 * 
 * @example
 * ```tsx
 * function MyCommands() {
 *   useAIChatCommand({
 *     name: 'clear',
 *     description: 'Clear the chat history',
 *     parameters: z.object({}),
 *     execute: async () => {
 *       await clearChatHistory()
 *     }
 *   })
 *   
 *   useAIChatCommand({
 *     name: 'counter',
 *     description: 'Set counter to a specific value',
 *     parameters: z.object({
 *       value: z.number().describe('The value to set')
 *     }),
 *     execute: async ({ value }) => {
 *       setCounter(value)
 *     }
 *   })
 * }
 * ```
 */
export function useAIChatCommand(command: ChatCommand) {
  // SINGLE Zustand call to minimize hook count
  const { registerCommand, unregisterCommand } = useAIChatCommandsStore(useShallow(state => ({
    registerCommand: state.registerCommand,
    unregisterCommand: state.unregisterCommand
  })))
  
  // Use single ref for all command data to minimize hook count  
  const commandDataRef = useRef<{
    command: ChatCommand
    signature: string
  }>({
    command,
    signature: JSON.stringify({
      name: command.name,
      description: command.description,
      parameters: command.parameters
    })
  })
  
  // Update refs (no additional hooks)
  const currentSignature = JSON.stringify({
    name: command.name,
    description: command.description,
    parameters: command.parameters
  })
  
  const hasSignatureChanged = commandDataRef.current.signature !== currentSignature
  commandDataRef.current.command = command
  
  useEffect(() => {
    // Create a wrapper that always calls the latest execute function
    const stableExecute = async (params: unknown) => {
      return commandDataRef.current.command.execute(params)
    }
    
    const stableCommand: ChatCommand = {
      name: command.name,
      description: command.description,
      parameters: command.parameters,
      execute: stableExecute
    }
    
    registerCommand(stableCommand)
    commandDataRef.current.signature = currentSignature
    
    return () => {
      unregisterCommand(command.name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command.name, hasSignatureChanged, currentSignature])
}