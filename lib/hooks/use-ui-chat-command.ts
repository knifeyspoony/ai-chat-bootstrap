import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAIChatCommandsStore, type UIChatCommand } from '@lib/stores/commands'

/**
 * Register UI chat commands that execute directly on the client.
 * These commands bypass the LLM and execute immediately when typed.
 * 
 * @param command - The UI chat command configuration (type is automatically set to 'ui')
 * 
 * @example
 * ```tsx
 * function MyCommands() {
 *   useUIChatCommand({
 *     name: 'clear',
 *     description: 'Clear the chat history',
 *     parameters: z.object({}),
 *     execute: async () => {
 *       await clearChatHistory()
 *     }
 *   })
 *   
 *   useUIChatCommand({
 *     name: 'theme',
 *     description: 'Change the theme',
 *     parameters: z.object({
 *       mode: z.enum(['light', 'dark']).describe('Theme mode')
 *     }),
 *     execute: async ({ mode }) => {
 *       setTheme(mode)
 *     }
 *   })
 * }
 * ```
 */
export function useUIChatCommand(command: Omit<UIChatCommand, 'type'>) {
  // SINGLE Zustand call to minimize hook count
  const { registerCommand, unregisterCommand } = useAIChatCommandsStore(useShallow(state => ({
    registerCommand: state.registerCommand,
    unregisterCommand: state.unregisterCommand
  })))
  
  // Use single ref for all command data to minimize hook count  
  const commandDataRef = useRef<{
    command: UIChatCommand
    signature: string
  }>({
    command: { ...command, type: 'ui' },
    signature: JSON.stringify({
      name: command.name,
      description: command.description,
      parameters: command.parameters,
      type: 'ui'
    })
  })
  
  // Update refs (no additional hooks)
  const currentSignature = JSON.stringify({
    name: command.name,
    description: command.description,
    parameters: command.parameters,
    type: 'ui'
  })
  
  const hasSignatureChanged = commandDataRef.current.signature !== currentSignature
  commandDataRef.current.command = { ...command, type: 'ui' }
  
  useEffect(() => {
    // Create a wrapper that always calls the latest execute function
    const stableExecute = async (params: unknown) => {
      return commandDataRef.current.command.execute(params)
    }
    
    const stableCommand: UIChatCommand = {
      type: 'ui',
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