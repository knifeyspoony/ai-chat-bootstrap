import { asSchema } from "@ai-sdk/provider-utils";
import { z } from "zod";
import { create } from "zustand";

/**
 * Generic frontend tool definition.
 * P - Zod schema type for input parameters.
 * R - Return type of the tool execution.
 * Defaults keep backwards compatibility so existing code that didn't use generics still works.
 */
export interface FrontendTool<
  P extends z.ZodTypeAny = z.ZodTypeAny,
  R = unknown
> {
  name: string;
  description: string;
  parameters: P;
  execute: (params: z.infer<P>) => Promise<R> | R;
  render?: (result: R) => React.ReactNode;
}

// Convenience alias for internal non-generic storage usage
export type AnyFrontendTool = FrontendTool<z.ZodTypeAny, any>;

export interface SerializedTool {
  name: string;
  description: string;
  inputSchema: unknown; // JSON Schema format for backend
}

export interface AIToolsStore {
  tools: Map<string, AnyFrontendTool>;
  registerTool: (tool: AnyFrontendTool) => void;
  unregisterTool: (name: string) => void;
  getTool: (name: string) => AnyFrontendTool | undefined;
  getAllTools: () => AnyFrontendTool[];
  executeTool: (name: string, params: unknown) => Promise<unknown>;
  serializeToolsForBackend: () => SerializedTool[];
}

export const useAIToolsStore = create<AIToolsStore>((set, get) => ({
  tools: new Map<string, AnyFrontendTool>(),

  registerTool: (tool: AnyFrontendTool) => {
    set((state) => ({
      tools: new Map(state.tools).set(tool.name, tool),
    }));
  },

  unregisterTool: (name: string) => {
    set((state) => {
      const newTools = new Map(state.tools);
      newTools.delete(name);
      return { tools: newTools };
    });
  },

  getTool: (name: string) => {
    return get().tools.get(name);
  },

  getAllTools: () => {
    return Array.from(get().tools.values());
  },

  executeTool: async (name: string, params: unknown) => {
    const tool = get().tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }

    try {
      // Validate parameters
      const validatedParams = tool.parameters.parse(params);
      // validatedParams now matches z.infer<typeof tool.parameters>
      return await tool.execute(validatedParams as any);
    } catch {
      throw new Error(`Error executing tool "${name}"`);
    }
  },

  serializeToolsForBackend: () => {
    const tools = Array.from(get().tools.values());
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: asSchema(tool.parameters).jsonSchema,
    }));
  },
}));
