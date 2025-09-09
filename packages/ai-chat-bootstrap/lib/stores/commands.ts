import { z } from "zod";
import { create } from "zustand";

export interface BaseChatCommand {
  name: string;
  description: string;
  parameters: z.ZodSchema;
}

export interface UIChatCommand extends BaseChatCommand {
  type: "ui";
  execute: (params: any) => void | Promise<void>;
}

export interface AIChatCommand extends BaseChatCommand {
  type: "ai";
  toolName: string;
  systemPrompt?: string;
}

export type ChatCommand = UIChatCommand | AIChatCommand;

export interface AIChatCommandsStore {
  commands: Map<string, ChatCommand>;
  registerCommand: (command: ChatCommand) => void;
  unregisterCommand: (name: string) => void;
  getCommand: (name: string) => ChatCommand | undefined;
  getAllCommands: () => ChatCommand[];
  executeCommand: (name: string, params: any) => Promise<void>;
  getMatchingCommands: (input: string) => ChatCommand[];
}

export const useAIChatCommandsStore = create<AIChatCommandsStore>(
  (set, get) => ({
    commands: new Map<string, ChatCommand>(),

    registerCommand: (command: ChatCommand) => {
      set((state) => ({
        commands: new Map(state.commands).set(command.name, command),
      }));
    },

    unregisterCommand: (name: string) => {
      set((state) => {
        const newCommands = new Map(state.commands);
        newCommands.delete(name);
        return { commands: newCommands };
      });
    },

    getCommand: (name: string) => {
      return get().commands.get(name);
    },

    getAllCommands: () => {
      return Array.from(get().commands.values());
    },

    executeCommand: async (name: string, params: any) => {
      const command = get().commands.get(name);
      if (!command) {
        throw new Error(`Command "${name}" not found`);
      }

      if (command.type === "ai") {
        throw new Error(
          `Cannot execute AI command "${name}" directly. Use sendAICommand instead.`
        );
      }

      try {
        // Validate parameters using the command's schema
        const validatedParams = command.parameters.parse(params);
        await command.execute(validatedParams);
      } catch (error) {
        console.error(`Error executing command "${name}":`, error);
        throw error;
      }
    },

    getMatchingCommands: (input: string) => {
      const query = input.toLowerCase();
      return Array.from(get().commands.values())
        .filter(
          (command) =>
            command.name.toLowerCase().includes(query) ||
            command.description.toLowerCase().includes(query)
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  })
);
