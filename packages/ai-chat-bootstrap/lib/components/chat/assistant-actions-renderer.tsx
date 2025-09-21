"use client";

import type { UIMessage } from "ai";
import React, { useMemo } from "react";
import type {
  AssistantAction,
  AssistantActionsConfig,
} from "../../types/actions";
import { Action, Actions } from "../ai-elements/actions";

export interface AssistantActionsRendererProps {
  message: UIMessage;
  actionsConfig?: AssistantActionsConfig;
  isLatestAssistant?: boolean;
  className?: string;
}

/**
 * Renders assistant actions based on configuration objects
 */
export const AssistantActionsRenderer = React.memo(
  function AssistantActionsRenderer({
    message,
    actionsConfig,
    isLatestAssistant = false,
    className,
  }: AssistantActionsRendererProps) {
    // Resolve actions from config (could be static array or function)
    const resolvedActions = useMemo((): AssistantAction[] => {
      if (!actionsConfig) return [];

      if (typeof actionsConfig === "function") {
        return actionsConfig(message);
      }

      return actionsConfig;
    }, [actionsConfig, message]);

    // Filter actions based on visibility, disabled state, and onlyOnMostRecent
    const visibleActions = useMemo(() => {
      return resolvedActions.filter((action) => {
        // Filter by onlyOnMostRecent
        if (action.onlyOnMostRecent && !isLatestAssistant) {
          return false;
        }

        // Filter by visibility function
        if (action.visible && !action.visible(message)) {
          return false;
        }

        return true;
      });
    }, [resolvedActions, message, isLatestAssistant]);

    // Memoize click handlers to prevent re-renders
    const handleActionClick = useMemo(() => {
      const handlers: Record<string, () => void> = {};

      visibleActions.forEach((action) => {
        handlers[action.id] = () => action.onClick(message);
      });

      return handlers;
    }, [visibleActions, message]);

    if (visibleActions.length === 0) {
      return null;
    }

    return (
      <Actions className={className}>
        {visibleActions.map((action) => {
          const IconComponent = action.icon;
          const isDisabled = action.disabled ? action.disabled(message) : false;

          return (
            <Action
              key={action.id}
              tooltip={action.tooltip}
              label={action.label}
              onClick={handleActionClick[action.id]}
              disabled={isDisabled}
            >
              <IconComponent className="h-3 w-3" />
            </Action>
          );
        })}
      </Actions>
    );
  }
);
