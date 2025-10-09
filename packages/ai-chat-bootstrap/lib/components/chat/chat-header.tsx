import React, { memo, useMemo } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../utils";

export interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  avatar?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

const ChatHeaderImpl = ({
  title,
  subtitle,
  avatar,
  badge,
  className,
  actions,
}: ChatHeaderProps) => {
  // Normalize actions into an array for consistent spacing
  const actionItems = useMemo(
    () => React.Children.toArray(actions ?? []),
    [actions]
  );
  const hasActions = actionItems.length > 0;

  if (!title && !subtitle && !avatar && !hasActions) {
    return null;
  }

  return (
    <div
      data-acb-part="header"
      className={cn(
        "flex items-center justify-between px-4 py-3 rounded-t-md border-b backdrop-blur-sm shadow-sm",
        "bg-[var(--acb-chat-header-bg)] text-[var(--acb-chat-header-fg)] border-[var(--acb-chat-header-border)]",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {avatar && (
          <div className="relative flex-shrink-0">
            {typeof avatar === "string" ? (
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatar} alt={title || "Chat"} />
                <AvatarFallback>
                  {title ? title[0].toUpperCase() : "AI"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-8 w-8 flex items-center justify-center">
                {avatar}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 min-w-0 flex-1">
          {title && (
            <h3 className="font-semibold text-base truncate">{title}</h3>
          )}
          {badge &&
            (typeof badge === "string" ? (
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {badge}
              </Badge>
            ) : (
              <div className="flex-shrink-0 text-xs">{badge}</div>
            ))}
          {subtitle && (
            <span className="text-xs text-muted-foreground truncate">
              • {subtitle}
            </span>
          )}
        </div>
      </div>

      {hasActions && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {actionItems.map((item, index) => {
            const key =
              React.isValidElement(item) && item.key != null
                ? item.key
                : index;
            return (
              <div key={key} className="flex items-center justify-center">
                {item}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// React.memo with custom comparison for performance
export const ChatHeader = memo(ChatHeaderImpl, (prevProps, nextProps) => {
  // Check primitive props first (fast)
  if (prevProps.title !== nextProps.title) return false;
  if (prevProps.subtitle !== nextProps.subtitle) return false;
  if (prevProps.className !== nextProps.className) return false;

  // Check React.ReactNode props (these are often recreated)
  if (prevProps.avatar !== nextProps.avatar) {
    // For string avatars, do deep comparison
    if (typeof prevProps.avatar === 'string' && typeof nextProps.avatar === 'string') {
      if (prevProps.avatar !== nextProps.avatar) return false;
    } else {
      // For ReactNode avatars, assume reference equality is needed
      return false;
    }
  }

  if (prevProps.badge !== nextProps.badge) {
    // For string badges, do deep comparison
    if (typeof prevProps.badge === 'string' && typeof nextProps.badge === 'string') {
      if (prevProps.badge !== nextProps.badge) return false;
    } else {
      // For ReactNode badges, assume reference equality is needed
      return false;
    }
  }

  // Actions prop is often recreated, so we'll accept this causes re-renders
  // since the content is dynamic and complex to compare
  if (prevProps.actions !== nextProps.actions) return false;

  // All relevant props are the same
  return true;
});

ChatHeader.displayName = "ChatHeader";
