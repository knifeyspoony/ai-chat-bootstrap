"use client";

import {
  useAIChatCommand,
  useAIContext,
  useAIFocus,
  useAIFrontendTool,
  useAIToolsStore,
  useUIChatCommand,
} from "ai-chat-bootstrap";
import { useMemo } from "react";
import { z } from "zod";

interface UseDemoAIParams {
  counter: number;
  setCounter: (value: number | ((prev: number) => number)) => void;
  calculation: string | null;
  setCalculation: (value: string | null) => void;
  selectedSystemPrompt: string;
  setSelectedSystemPrompt: (value: string) => void;
  setChatMode: (value: "overlay" | "inline") => void;
}

interface UseDemoAIReturn {
  focusedIds: string[];
  toolsCount: number;
  handleFocusToggle: (itemId: string) => void;
  getFocus: (itemId: string) => unknown;
  clearAllFocus: () => void;
  userProfile: {
    userId: string;
    name: string;
    email: string;
    role: string;
    plan: string;
    preferences: { theme: string; notifications: boolean };
  };
  dbSettings: {
    dbId: string;
    engine: string;
    host: string;
    port: number;
    database: string;
    ssl: boolean;
    pool: { min: number; max: number };
    replicas: string[];
  };
}

export function useDemoAI({
  counter,
  setCounter,
  calculation,
  setCalculation,
  selectedSystemPrompt,
  setSelectedSystemPrompt,
  setChatMode,
}: UseDemoAIParams): UseDemoAIReturn {
  // Focus management
  const { setFocus, clearFocus, getFocus, focusedIds, clearAllFocus } =
    useAIFocus();
  const toolsCount = useAIToolsStore((state) => state.tools.size);

  // Demo domain objects to use as focus items
  const userProfile = useMemo(
    () => ({
      userId: "user-042",
      name: "Ada Lovelace",
      email: "ada@example.com",
      role: "admin",
      plan: "Pro",
      preferences: { theme: "dark", notifications: true },
    }),
    []
  );

  const dbSettings = useMemo(
    () => ({
      dbId: "db-primary",
      engine: "postgres",
      host: "db.example.com",
      port: 5432,
      database: "app_db",
      ssl: true,
      pool: { min: 1, max: 10 },
      replicas: ["replica-1", "replica-2"],
    }),
    []
  );

  // System prompt options
  const systemPrompts = {
    default: undefined,
    helpful:
      "You are a friendly and enthusiastic AI assistant. Be encouraging and positive in your responses while helping users explore this demo.",
    technical:
      "You are a technical AI assistant focused on demonstrating the integration between AI and React applications. Explain technical concepts clearly and suggest advanced usage patterns.",
    creative:
      "You are a creative AI assistant. When users interact with the demo, suggest interesting and creative ways to use the tools and features. Be imaginative and inspiring.",
  };

  // Memoize pageInfo to prevent recreating object on every render
  const pageInfo = useMemo(
    () => ({
      title: "AI SDK Chat Demo",
      description: "Interactive demo showcasing AI-app integration",
      timestamp: new Date().toISOString(),
    }),
    []
  ); // Empty deps - only create once on mount

  // Share state with AI
  useAIContext("counter", counter);
  useAIContext("calculation", calculation);
  useAIContext("selectedSystemPrompt", selectedSystemPrompt);
  useAIContext("pageInfo", pageInfo);

  // Focus item handler
  const handleFocusToggle = (itemId: string) => {
    const isCurrentlyFocused = getFocus(itemId);

    if (isCurrentlyFocused) {
      clearFocus(itemId);
    } else {
      // Add item to focus with relevant data
      let focusData: { id: string; [key: string]: unknown } = { id: itemId };

      if (itemId === "counter-widget") {
        focusData = {
          id: itemId,
          type: "counter",
          currentValue: counter,
          capabilities: ["increment", "decrement"],
        };
      } else if (itemId === "calculator-widget") {
        focusData = {
          id: itemId,
          type: "calculator",
          result: calculation,
          capabilities: ["calculate", "clear"],
        };
      } else if (itemId === "settings-widget") {
        focusData = {
          id: itemId,
          type: "settings",
          systemPrompt: selectedSystemPrompt,
        };
      } else if (itemId === "db-settings") {
        // Dump full database settings object
        focusData = {
          id: itemId,
          ...dbSettings,
          type: "database",
        };
      } else if (itemId === "user-profile") {
        // Dump full user profile object
        focusData = {
          id: itemId,
          ...userProfile,
          type: "user",
        };
      }

      setFocus(itemId, focusData);
    }
  };

  // Register frontend tools
  useAIFrontendTool({
    name: "increment_counter",
    description: "Increment the demo counter",
    parameters: z.object({
      amount: z.number().default(1).describe("Amount to increment by"),
    }),
    execute: async (params: unknown) => {
      const { amount } = params as { amount: number };
      let newValue: number = 0;
      setCounter((prev) => {
        newValue = prev + amount;
        return newValue;
      });
      return { newValue, amount };
    },
  });

  useAIFrontendTool({
    name: "decrement_counter",
    description: "Decrement the demo counter",
    parameters: z.object({
      amount: z.number().default(1).describe("Amount to decrement by"),
    }),
    execute: async (params: unknown) => {
      const { amount } = params as { amount: number };
      let newValue: number = 0;
      setCounter((prev) => {
        newValue = prev - amount;
        return newValue;
      });
      return { newValue, amount };
    },
  });

  useAIFrontendTool({
    name: "calculate",
    description: "Perform basic arithmetic calculations and display the result",
    parameters: z.object({
      operation: z
        .enum(["add", "subtract", "multiply", "divide"])
        .describe("The arithmetic operation"),
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    }),
    execute: async (params: unknown) => {
      const { operation, a, b } = params as {
        operation: string;
        a: number;
        b: number;
      };
      let result: number = 0;
      switch (operation) {
        case "add":
          result = a + b;
          break;
        case "subtract":
          result = a - b;
          break;
        case "multiply":
          result = a * b;
          break;
        case "divide":
          if (b === 0) throw new Error("Division by zero");
          result = a / b;
          break;
      }

      const resultString = `${a} ${operation} ${b} = ${result}`;
      setCalculation(resultString);
      return {
        operation,
        a,
        b,
        result,
        message: resultString,
      };
    },
  });

  useAIFrontendTool({
    name: "change_system_prompt",
    description: "Change the AI assistant personality and behavior",
    parameters: z.object({
      promptType: z
        .enum(["default", "helpful", "technical", "creative"])
        .describe("The type of AI personality to use"),
    }),
    execute: async (params: unknown) => {
      const { promptType } = params as { promptType: string };
      setSelectedSystemPrompt(promptType);
      return {
        promptType,
        message: `AI personality changed to: ${promptType}`,
        description:
          promptType === "default"
            ? "Using default system prompt"
            : systemPrompts[promptType as keyof typeof systemPrompts],
      };
    },
  });

  // Register UI commands (client-side only)
  useUIChatCommand({
    name: "reset",
    description: "Reset all demo widgets to initial state",
    parameters: z.object({}),
    execute: async () => {
      setCounter(0);
      setCalculation(null);
      setSelectedSystemPrompt("default");
      clearAllFocus(); // Clear all focus
    },
  });

  useUIChatCommand({
    name: "counter",
    description: "Set counter to a specific value",
    parameters: z.object({
      value: z.number().describe("The value to set"),
    }),
    execute: async (params: unknown) => {
      const { value } = params as { value: number };
      setCounter(value);
    },
  });

  useUIChatCommand({
    name: "personality",
    description: "Change AI personality",
    parameters: z.object({
      type: z
        .enum(["default", "helpful", "technical", "creative"])
        .default("default")
        .describe("Personality type"),
    }),
    execute: async (params: unknown) => {
      const { type } = params as { type: string };
      setSelectedSystemPrompt(type);
    },
  });

  useUIChatCommand({
    name: "focus",
    description: "Focus specific widgets",
    parameters: z.object({
      widgetIds: z
        .string()
        .describe(
          "Widget IDs separated by commas (counter-widget, calculator-widget, settings-widget, db-settings, user-profile, context-panel)"
        ),
    }),
    execute: async (params: unknown) => {
      const { widgetIds } = params as { widgetIds: string };
      const ids = widgetIds.split(",").map((id: string) => id.trim());
      ids.forEach((id: string) => {
        const validIds = [
          "counter-widget",
          "calculator-widget",
          "settings-widget",
          "db-settings",
          "user-profile",
          "context-panel",
        ];
        if (validIds.includes(id)) {
          handleFocusToggle(id);
        }
      });
    },
  });

  useUIChatCommand({
    name: "clear",
    description: "Clear calculator result",
    parameters: z.object({}),
    execute: async () => {
      setCalculation(null);
    },
  });

  useUIChatCommand({
    name: "mode",
    description: "Switch chat mode",
    parameters: z.object({
      mode: z.enum(["overlay", "inline"]).describe("Chat display mode"),
    }),
    execute: async (params: unknown) => {
      const { mode } = params as { mode: "overlay" | "inline" };
      setChatMode(mode);
    },
  });

  useUIChatCommand({
    name: "demo",
    description: "Demo command with multiple parameters for testing",
    parameters: z.object({
      name: z.string().describe("Your name or identifier"),
      count: z
        .number()
        .default(1)
        .describe("Number of times to repeat the greeting"),
    }),
    execute: async (params: unknown) => {
      const { name, count } = params as { name: string; count: number };
      // Just log to console for demo purposes
      console.log(`Demo executed: Hello ${name}! (repeated ${count} times)`);

      // Could also update some UI state if needed
      const message = `Hello ${name}!`.repeat(count);
      console.log(message);
    },
  });

  // Add AI commands that use specific tools
  useAIChatCommand({
    name: "calculate",
    description: "Ask AI to perform a calculation",
    toolName: "calculate",
    parameters: z.object({
      expression: z.string().describe('Math expression (e.g., "25 * 4")'),
    }),
    systemPrompt:
      "You are a helpful calculator. Parse the user's math expression and use the calculate tool to compute the result. Be precise and clear in your response.",
  });

  useAIChatCommand({
    name: "increment",
    description: "Ask AI to increment the counter",
    toolName: "increment_counter",
    parameters: z.object({
      amount: z.number().default(1).describe("Amount to increment by"),
    }),
    systemPrompt:
      "You are helping manage a counter widget. Use the increment_counter tool to increase the counter value as requested.",
  });

  return {
    focusedIds,
    toolsCount,
    handleFocusToggle,
    getFocus,
    clearAllFocus,
    userProfile,
    dbSettings,
  };
}
