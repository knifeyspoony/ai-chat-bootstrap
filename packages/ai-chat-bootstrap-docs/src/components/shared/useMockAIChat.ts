import { MockChatContainer, type UIMessage } from "ai-chat-bootstrap";
import {
  useMemo,
  useState,
  type ComponentProps,
  type Dispatch,
  type SetStateAction,
} from "react";

interface MockChatOptions {
  /**
   * Custom response function for simulating AI responses
   */
  responseGenerator?: (userMessage: string) => string;
  /**
   * Delay in ms for simulating network latency
   */
  responseDelay?: number;
  /**
   * Custom initial messages
   */
  initialMessages?: UIMessage[];
}

type MockChatBase = ComponentProps<typeof MockChatContainer>["chat"];

// Mock useAIChat hook for demo purposes
type MockChat = MockChatBase & {
  setIsLoading: Dispatch<SetStateAction<boolean>>;
};

export function useMockAIChat(options: MockChatOptions = {}): MockChat {
  const {
    responseGenerator = (text) =>
      `You said: "${text}". This is a mock response from the AI model.`,
    responseDelay = 600,
    initialMessages = [],
  } = options;

  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const sendMessageWithContext = (text: string) => {
    if (!text.trim()) return;
    const userMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text }],
    };
    setMessages((m) => [...m, userMessage]);
    setIsLoading(true);

    // Simulate AI response after delay
    setTimeout(() => {
      const assistantMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [
          {
            type: "text",
            text: responseGenerator(text),
          },
        ],
      };
      setMessages((m) => [...m, assistantMessage]);
      setIsLoading(false);
    }, responseDelay);
  };

  // Mock functions to match useAIChat interface
  const sendAICommandMessage = (
    content: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _toolName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _commandSystemPrompt?: string
  ) => {
    // For mock purposes, just use sendMessageWithContext
    sendMessageWithContext(content);
  };

  const retryLastMessage = () => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      const textPart = lastMessage.parts?.find((part) => part.type === "text");
      if (textPart && "text" in textPart) {
        sendMessageWithContext(textPart.text);
      }
    }
  };

  const clearError = () => {
    setError(undefined);
  };

  // Mock sendMessage function (from useChat) - matches the AI SDK interface
  const sendMessage = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message?: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    options?: any
  ): Promise<void> => {
    if (message?.text) {
      sendMessageWithContext(message.text);
    }
    return Promise.resolve();
  };

  const compression = useMemo<MockChat["compression"]>(
    () => ({
      config: { enabled: false },
      pinnedMessages: [],
      artifacts: [],
      events: [],
      usage: null,
      metadata: null,
      snapshot: null,
      shouldCompress: false,
      overBudget: false,
      actions: {
        pinMessage: () => {},
        setPinnedMessages: () => {},
        unpinMessage: () => {},
        clearPinnedMessages: () => {},
        addArtifact: () => {},
        updateArtifact: () => {},
        removeArtifact: () => {},
        setArtifacts: () => {},
        clearArtifacts: () => {},
        recordEvent: () => {},
        setModelMetadata: () => {},
        setUsage: () => {},
        setSnapshot: () => {},
      },
      runCompression: async () =>
        Promise.resolve({
          messages: [],
          pinnedMessageIds: [],
          artifactIds: [],
          survivingMessageIds: [],
          usage: {
            totalTokens: 0,
            pinnedTokens: 0,
            artifactTokens: 0,
            survivingTokens: 0,
            updatedAt: Date.now(),
          },
          shouldCompress: false,
          overBudget: false,
        }),
    }),
    []
  );

  return {
    // From useChat (AI SDK)
    id: "mock-chat-id",
    messages,
    status: isLoading ? ("streaming" as const) : ("ready" as const),
    error,
    sendMessage,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    regenerate: (() => Promise.resolve()) as any, // Mock function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stop: (() => Promise.resolve()) as any, // Mock function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resumeStream: (() => Promise.resolve()) as any, // Mock function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addToolResult: (() => Promise.resolve()) as any, // Mock function
    clearError,
    setMessages,

    // From useAIChat (our hook)
    input,
    setInput,
    isLoading,
    sendMessageWithContext,
    sendAICommandMessage,
    retryLastMessage,

    // Store state properties
    context: [],
    availableTools: [],
    tools: [],
    focusItems: [],

    // Configuration properties
    models: [],
    model: undefined,
    setModel: () => {},
    chainOfThoughtEnabled: false,
    mcpEnabled: false,
    threadId: undefined,
    scopeKey: undefined,
    compression,
    branching: { enabled: false as const },

    // Utility functions for tests
    setIsLoading,
  } as MockChat;
}
