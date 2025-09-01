"use client"

import React, { useEffect, useRef } from "react"
import { Terminal, Sparkles } from "lucide-react"
import { cn } from "@lib/utils"
import { type ChatCommand } from "@lib/stores/commands"

export interface CommandDropdownProps {
  commands: ChatCommand[]
  selectedIndex: number
  onSelect: (command: ChatCommand, index: number) => void
  onSelectedIndexChange: (index: number) => void
  className?: string
}

export const CommandDropdown = React.forwardRef<
  HTMLDivElement,
  CommandDropdownProps
>(({ 
  commands, 
  selectedIndex, 
  onSelect, 
  onSelectedIndexChange,
  className
}, ref) => {
  const listRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedItem = listRef.current.querySelector(`[data-command-index="${selectedIndex}"]`)
      if (selectedItem) {
        selectedItem.scrollIntoView({ 
          block: 'nearest',
          behavior: 'smooth'
        })
      }
    }
  }, [selectedIndex])

  if (commands.length === 0) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn(
        "absolute bottom-full mb-2 left-0 right-0 z-50",
        "rounded-lg border border-border bg-popover text-popover-foreground shadow-md",
        "max-h-48 overflow-hidden",
        className
      )}
    >
      <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
        Available Commands
      </div>
      <div 
        ref={listRef}
        className="max-h-40 overflow-y-auto overflow-x-hidden py-1"
      >
        {commands.slice(0, 10).map((command, index) => (
          <div
            key={command.name}
            data-command-index={index}
            className={cn(
              "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              index === selectedIndex 
                ? "bg-accent text-accent-foreground" 
                : "text-foreground"
            )}
            onClick={() => onSelect(command, index)}
            onMouseEnter={() => onSelectedIndexChange(index)}
          >
            {command.type === 'ai' ? (
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Terminal className="h-4 w-4 text-primary shrink-0" />
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-medium truncate">/{command.name}</span>
              <span className="text-xs text-muted-foreground truncate">
                {command.description}
              </span>
            </div>
          </div>
        ))}
      </div>
      {commands.length > 10 && (
        <div className="px-3 py-1 text-xs text-muted-foreground border-t border-border">
          ... and {commands.length - 10} more
        </div>
      )}
    </div>
  )
})

CommandDropdown.displayName = "CommandDropdown"