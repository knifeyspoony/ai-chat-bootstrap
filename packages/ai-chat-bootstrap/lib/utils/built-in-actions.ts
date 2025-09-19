import type { UIMessage } from "ai";
import { CopyIcon, RefreshCwIcon, ThumbsUpIcon, ThumbsDownIcon, BugIcon } from "lucide-react";
import type { AssistantAction } from "../types/actions";

/**
 * Helper to extract text content from a message
 */
function getMessageText(message: UIMessage): string {
  const textParts = message.parts?.filter(
    (part): part is { type: "text"; text: string } =>
      part.type === "text" && typeof part.text === "string"
  );
  return textParts
    ?.map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n\n") || "";
}

/**
 * Creates the built-in Copy action
 */
export function createCopyAction(): AssistantAction {
  return {
    id: "built-in-copy",
    icon: CopyIcon,
    tooltip: "Copy message",
    label: "Copy",
    onClick: (message) => {
      const text = getMessageText(message);
      if (text) {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          void navigator.clipboard.writeText(text);
        } else {
          console.warn("Clipboard API not available in this environment");
        }
      }
    },
    disabled: (message) => !getMessageText(message),
  };
}

/**
 * Creates the built-in Regenerate action
 */
export function createRegenerateAction(params: {
  regenerate?: (options?: { messageId?: string }) => Promise<void>;
  isLoading?: boolean;
}): AssistantAction {
  return {
    id: "built-in-regenerate",
    icon: RefreshCwIcon,
    tooltip: "Regenerate response",
    label: "Regenerate",
    onlyOnMostRecent: true,
    onClick: (message) => {
      void params.regenerate?.({ messageId: message.id });
    },
    disabled: () => !params.regenerate || Boolean(params.isLoading),
    visible: () => Boolean(params.regenerate),
  };
}

/**
 * Creates the built-in Feedback actions (thumbs up and down)
 */
export function createFeedbackActions(callbacks: {
  onThumbsUp: (message: UIMessage) => void | Promise<void>;
  onThumbsDown: (message: UIMessage) => void | Promise<void>;
}): AssistantAction[] {
  return [
    {
      id: "built-in-thumbs-up",
      icon: ThumbsUpIcon,
      tooltip: "Good response",
      label: "Like",
      onClick: (message) => {
        void callbacks.onThumbsUp(message);
      },
    },
    {
      id: "built-in-thumbs-down",
      icon: ThumbsDownIcon,
      tooltip: "Poor response",
      label: "Dislike",
      onClick: (message) => {
        void callbacks.onThumbsDown(message);
      },
    },
  ];
}

/**
 * Creates the built-in Debug action
 */
export function createDebugAction(): AssistantAction {
  return {
    id: "built-in-debug",
    icon: BugIcon,
    tooltip: "View message details",
    label: "Debug",
    onClick: (message) => {
      console.log("Message debug info:", {
        id: message.id,
        role: message.role,
        parts: message.parts,
        metadata: message.metadata,
      });

      if (typeof window !== "undefined" && typeof window.alert === "function") {
        const partTypes = message.parts?.map((p) => p.type).join(", ") || "none";
        window.alert(
          `Message ID: ${message.id}\nRole: ${message.role}\nPart types: ${partTypes}\n\n(Full details logged to console)`
        );
      }
    },
  };
}

/**
 * Builds an array of built-in actions based on configuration
 */
export function buildBuiltInActions(
  config: {
    copy?: boolean;
    regenerate?: boolean;
    debug?: boolean;
    feedback?: {
      onThumbsUp: (message: UIMessage) => void | Promise<void>;
      onThumbsDown: (message: UIMessage) => void | Promise<void>;
    };
  },
  environment: {
    regenerate?: (options?: { messageId?: string }) => Promise<void>;
    isLoading?: boolean;
  } = {}
): AssistantAction[] {
  const actions: AssistantAction[] = [];

  if (config.copy) {
    actions.push(createCopyAction());
  }

  if (config.regenerate) {
    actions.push(
      createRegenerateAction({
        regenerate: environment.regenerate,
        isLoading: environment.isLoading,
      })
    );
  }

  if (config.feedback) {
    actions.push(...createFeedbackActions(config.feedback));
  }

  if (config.debug) {
    actions.push(createDebugAction());
  }

  return actions;
}
