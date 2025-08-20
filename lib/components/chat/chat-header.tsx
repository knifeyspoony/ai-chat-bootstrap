import React from "react"
import { cn } from "@lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@lib/components/ui/avatar"
import { Badge } from "@lib/components/ui/badge"

export interface ChatHeaderProps {
  title?: string
  subtitle?: string
  avatar?: string
  status?: "online" | "offline" | "away" | "busy"
  badge?: string
  className?: string
  actions?: React.ReactNode
}

export function ChatHeader({
  title,
  subtitle,
  avatar,
  status,
  badge,
  className,
  actions
}: ChatHeaderProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "online": return "bg-green-500"
      case "away": return "bg-yellow-500"
      case "busy": return "bg-red-500"
      case "offline": return "bg-gray-400"
      default: return "bg-gray-400"
    }
  }

  if (!title && !subtitle && !avatar && !actions) {
    return null
  }

  return (
    <div className={cn(
      "flex items-center justify-between p-4 border-b bg-background/50 backdrop-blur-sm",
      className
    )}>
      <div className="flex items-center gap-3">
        {avatar && (
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatar} alt={title || "Chat"} />
              <AvatarFallback>
                {title ? title[0].toUpperCase() : "AI"}
              </AvatarFallback>
            </Avatar>
            {status && (
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                getStatusColor(status)
              )} />
            )}
          </div>
        )}
        
        <div className="flex flex-col">
          {title && (
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">{title}</h3>
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}