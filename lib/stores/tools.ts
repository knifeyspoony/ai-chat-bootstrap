import { create } from 'zustand'
import { z } from 'zod'
import { asSchema } from '@ai-sdk/provider-utils'

export interface FrontendTool {
  name: string
  description: string
  parameters: z.ZodSchema
  execute: (params: unknown) => Promise<unknown> | unknown
  render?: (result: unknown) => React.ReactNode
}

export interface SerializedTool {
  name: string
  description: string
  inputSchema: unknown // JSON Schema format for backend
}

export interface AIToolsStore {
  tools: Map<string, FrontendTool>
  registerTool: (tool: FrontendTool) => void
  unregisterTool: (name: string) => void
  getTool: (name: string) => FrontendTool | undefined
  getAllTools: () => FrontendTool[]
  executeTool: (name: string, params: unknown) => Promise<unknown>
  serializeToolsForBackend: () => SerializedTool[]
}

export const useAIToolsStore = create<AIToolsStore>((set, get) => ({
  tools: new Map<string, FrontendTool>(),
  
  registerTool: (tool: FrontendTool) => {
    set(state => ({
      tools: new Map(state.tools).set(tool.name, tool)
    }))
  },
  
  unregisterTool: (name: string) => {
    set(state => {
      const newTools = new Map(state.tools)
      newTools.delete(name)
      return { tools: newTools }
    })
  },
  
  getTool: (name: string) => {
    return get().tools.get(name)
  },
  
  getAllTools: () => {
    return Array.from(get().tools.values())
  },
  
  executeTool: async (name: string, params: unknown) => {
    const tool = get().tools.get(name)
    if (!tool) {
      throw new Error(`Tool "${name}" not found`)
    }
    
    try {
      // Validate parameters
      const validatedParams = tool.parameters.parse(params)
      return await tool.execute(validatedParams)
    } catch (error) {
      console.error(`Error executing tool "${name}":`, error)
      throw error
    }
  },
  
  serializeToolsForBackend: () => {
    const tools = Array.from(get().tools.values())
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: asSchema(tool.parameters).jsonSchema
    }))
  }
}))