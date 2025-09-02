"use client"

import React from "react"
import { Hash, Type, Terminal } from "lucide-react"
import { cn } from "../../utils"
import { type ChatCommand } from "../../stores/commands"
import { getParameterInfo } from "../../utils/command-utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card"

export interface CommandParameterInfoProps {
  command: ChatCommand
  currentParameterIndex?: number
  validationError?: string
}

export const CommandParameterInfo = ({ 
  command, 
  currentParameterIndex = 0,
  validationError
}: CommandParameterInfoProps) => {
  const paramInfo = getParameterInfo(command.parameters)

  return (
    <Card className="min-w-80 shadow-lg gap-2 py-3">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-3 w-3 text-primary" />
          <CardTitle className="text-sm">/{command.name}</CardTitle>
        </div>
        <CardDescription className="text-xs">{command.description}</CardDescription>
      </CardHeader>

      <CardContent className="py-0">
        {paramInfo.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No parameters required</p>
        ) : (
          <div className="space-y-2">
            {paramInfo.map((param, index) => (
              <div
                key={param.name}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-md",
                  index === currentParameterIndex
                    ? "bg-accent/50" 
                    : "hover:bg-muted/30"
                )}
              >
                <Hash className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className={cn(
                      "text-xs font-mono px-1.5 py-0.5 rounded bg-muted",
                      index === currentParameterIndex 
                        ? "text-accent-foreground bg-accent/30 font-semibold" 
                        : "text-foreground"
                    )}>
                      {param.name}{param.isOptional ? '?' : ''}
                    </code>
                    <span className="text-xs text-muted-foreground font-mono">
                      {param.type}
                    </span>
                    {!param.isOptional && (
                      <span className="text-xs bg-destructive/10 text-destructive px-1 py-0.5 rounded">
                        required
                      </span>
                    )}
                  </div>
                  {param.description && (
                    <p className="text-xs text-muted-foreground leading-tight">
                      {param.description}
                    </p>
                  )}
                  {param.defaultValue !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      Default: <code className="font-mono bg-muted px-1 rounded">
                        {String(param.defaultValue)}
                      </code>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="!pt-2 pb-1 border-t bg-muted/20">
        <div className="flex flex-col gap-1 w-full">
          <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
            <span>Press</span>
            <kbd className="px-1 py-0.5 bg-background border border-border rounded text-xs font-mono">
              Enter
            </kbd>
            <span>to execute or</span>
            <kbd className="px-1 py-0.5 bg-background border border-border rounded text-xs font-mono">
              Esc
            </kbd>
            <span>to cancel</span>
          </div>
          {validationError && (
            <div className="text-xs text-destructive">
              {validationError}
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}