import type { UIMessage } from "ai";
import type { ReactElement } from "react";

import { buildBranchMessages } from "../../utils/message-branches";

export interface AssistantBranchEntry {
  key: string;
  message: UIMessage;
  content: ReactElement;
}

export type RenderMessageBody = (
  message: UIMessage,
  options: { streaming: boolean; isLast: boolean }
) => ReactElement | null;

interface BuildAssistantBranchEntriesOptions {
  message: UIMessage;
  isStreaming: boolean;
  isLastMessage?: boolean;
  renderMessageBody: RenderMessageBody;
}

export const buildAssistantBranchEntries = ({
  message,
  isStreaming,
  isLastMessage,
  renderMessageBody,
}: BuildAssistantBranchEntriesOptions): AssistantBranchEntry[] => {
  const { branches } = buildBranchMessages(message);

  return branches
    .map((branchMessage, index) => {
      const streaming = isStreaming && index === branches.length - 1;
      const isLast = Boolean(isLastMessage && index === branches.length - 1);
      const content = renderMessageBody(branchMessage, { streaming, isLast });

      if (!content) {
        return null;
      }

      return {
        key: branchMessage.id ?? `branch-${index}`,
        message: branchMessage,
        content,
      } satisfies AssistantBranchEntry;
    })
    .filter((entry): entry is AssistantBranchEntry => entry !== null);
};
