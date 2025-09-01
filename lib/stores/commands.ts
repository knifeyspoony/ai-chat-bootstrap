import { create } from 'zustand'
import { z } from 'zod'

export interface ChatCommand {
  name: string
  description: string
  parameters: z.ZodSchema
  execute: (params: unknown) => void | Promise<void>
}

export interface AIChatCommandsStore {
  commands: Map<string, ChatCommand>
  registerCommand: (command: ChatCommand) => void
  unregisterCommand: (name: string) => void
  getCommand: (name: string) => ChatCommand | undefined
  getAllCommands: () => ChatCommand[]
  executeCommand: (name: string, params: unknown) => Promise<void>
  getMatchingCommands: (input: string) => ChatCommand[]
}

export const useAIChatCommandsStore = create<AIChatCommandsStore>((set, get) => ({
  commands: new Map<string, ChatCommand>(),
  
  registerCommand: (command: ChatCommand) => {
    set(state => ({
      commands: new Map(state.commands).set(command.name, command)
    }))
  },
  
  unregisterCommand: (name: string) => {
    set(state => {
      const newCommands = new Map(state.commands)
      newCommands.delete(name)
      return { commands: newCommands }
    })
  },
  
  getCommand: (name: string) => {
    return get().commands.get(name)
  },
  
  getAllCommands: () => {
    return Array.from(get().commands.values())
  },
  
  executeCommand: async (name: string, params: unknown) => {
    const command = get().commands.get(name)
    if (!command) {
      throw new Error(`Command "${name}" not found`)
    }
    
    try {
      // Validate parameters using the command's schema
      const validatedParams = command.parameters.parse(params)
      await command.execute(validatedParams)
    } catch (error) {
      console.error(`Error executing command "${name}":`, error)
      throw error
    }
  },
  
  getMatchingCommands: (input: string) => {
    const query = input.toLowerCase()
    return Array.from(get().commands.values()).filter(command =>
      command.name.toLowerCase().includes(query) ||
      command.description.toLowerCase().includes(query)
    )
  }
}))