import type { UIMessage } from "ai";

type MessagePart = UIMessage["parts"][number];

export interface AssistantMessageSegments {
  chainOfThoughtParts: MessagePart[];
  visibleRegularParts: MessagePart[];
  hasChainOfThought: boolean;
  hasRegularContent: boolean;
}

const isAssistantVisiblePart = (part: MessagePart) => {
  if (!part) {
    return false;
  }
  if (part.type?.startsWith("tool-acb_") || part.type === "dynamic-tool") {
    return false;
  }
  if (part.type === "step-start") {
    return false;
  }
  if (part.type === "text" || part.type === "reasoning") {
    return Boolean(part.text && part.text.trim() !== "");
  }
  return true;
};

export const getAssistantMessageSegments = (
  message: UIMessage
): AssistantMessageSegments => {
  const chainOfThoughtParts: MessagePart[] = [];
  const regularParts: MessagePart[] = [];
  let cotActive = false;

  message.parts?.forEach((part) => {
    if (part.type === "tool-acb_start_chain_of_thought") {
      cotActive = true;
      chainOfThoughtParts.push(part);
      return;
    }
    if (part.type === "tool-acb_complete_chain_of_thought" && cotActive) {
      chainOfThoughtParts.push(part);
      cotActive = false;
      return;
    }
    if (cotActive) {
      chainOfThoughtParts.push(part);
      return;
    }
    regularParts.push(part);
  });

  const visibleRegularParts = regularParts.filter(isAssistantVisiblePart);

  return {
    chainOfThoughtParts,
    visibleRegularParts,
    hasChainOfThought: chainOfThoughtParts.length > 0,
    hasRegularContent: visibleRegularParts.length > 0,
  };
};
