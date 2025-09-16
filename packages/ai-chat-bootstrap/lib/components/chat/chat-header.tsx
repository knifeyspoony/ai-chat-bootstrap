import { Settings2 } from "lucide-react";
import React from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { cn } from "../../utils";

export interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  avatar?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  showMcpButton?: boolean;
  onOpenMcpDialog?: () => void;
}

export const ChatHeader = React.memo(function ChatHeader({
  title,
  subtitle,
  avatar,
  badge,
  className,
  actions,
  showMcpButton,
  onOpenMcpDialog,
}: ChatHeaderProps) {
  const hasActions = showMcpButton || Boolean(actions);

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
        <div className="flex items-center gap-1 flex-shrink-0">
          {showMcpButton && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onOpenMcpDialog}
              aria-label="Configure MCP servers"
              disabled={!onOpenMcpDialog}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
          {actions}
        </div>
      )}
    </div>
  );
});
