import type { UIMessage } from "ai";
import type { ComponentType } from "react";

/**
 * Definition for a single assistant action that can be rendered in the action bar
 */
export interface AssistantAction {
  /** Unique identifier for the action */
  id: string;

  /** React component to render as the action icon */
  icon: ComponentType<{ className?: string }>;

  /** Accessible label for screen readers */
  label?: string;

  /** Tooltip text shown on hover */
  tooltip?: string;

  /** Whether this action should only appear on the most recent assistant message */
  onlyOnMostRecent?: boolean;

  /** Callback function executed when the action is clicked */
  onClick: (message: UIMessage) => void;

  /** Optional function to determine if the action should be visible */
  visible?: (message: UIMessage) => boolean;

  /** Optional function to determine if the action should be disabled */
  disabled?: (message: UIMessage) => boolean;
}

/**
 * Configuration for assistant actions - can be a static array or a function that returns an array based on the message
 */
export type AssistantActionsConfig =
  | AssistantAction[]
  | ((message: UIMessage) => AssistantAction[]);