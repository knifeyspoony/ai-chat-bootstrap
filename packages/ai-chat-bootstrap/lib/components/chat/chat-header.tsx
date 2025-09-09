import React from "react";
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
  avatar?: React.ReactNode; // string URL or custom node
  status?: React.ReactNode; // union string values or custom node
  badge?: React.ReactNode; // string or custom node
  className?: string;
  actions?: React.ReactNode;
}

export function ChatHeader({
  title,
  subtitle,
  avatar,
  status,
  badge,
  className,
  actions,
}: ChatHeaderProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "online":
        return "bg-primary";
      case "away":
        return "bg-secondary";
      case "busy":
        return "bg-destructive";
      case "offline":
        return "bg-muted-foreground";
      default:
        return "bg-muted-foreground";
    }
  };

  if (!title && !subtitle && !avatar && !actions) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2 bg-background/80 backdrop-blur-sm border-b border-border/90",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {avatar && (
          <div className="relative flex-shrink-0">
            {typeof avatar === "string" ? (
              <Avatar className="h-6 w-6">
                <AvatarImage src={avatar} alt={title || "Chat"} />
                <AvatarFallback>
                  {title ? title[0].toUpperCase() : "AI"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-6 w-6 flex items-center justify-center">
                {avatar}
              </div>
            )}
            {typeof status === "string" ? (
              <div
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background",
                  getStatusColor(status)
                )}
              />
            ) : null}
          </div>
        )}

        <div className="flex items-center gap-2 min-w-0 flex-1">
          {title && <h3 className="font-medium text-sm truncate">{title}</h3>}
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
          {status && typeof status !== "string" && (
            <span className="text-xs text-muted-foreground truncate">
              {status}
            </span>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-1 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}
