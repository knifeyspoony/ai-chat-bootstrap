import * as React from "react";
import { useAIContextStore } from "../../stores/context";
import { useAIFocusStore } from "../../stores/focus";
import { useAIToolsStore } from "../../stores/tools";
import { useAIMCPServersStore } from "../../stores/mcp";
import { cn } from "../../utils";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ScrollArea } from "../ui/scroll-area";

function JsonBlock({
  label,
  value,
  className,
}: {
  label: string;
  value: unknown;
  className?: string;
}) {
  const json = React.useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "<unserializable>";
    }
  }, [value]);

  const copy = () => navigator.clipboard?.writeText(json).catch(() => {});

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <Button size="sm" variant="outline" onClick={copy}>
          Copy JSON
        </Button>
      </div>
      <ScrollArea
        type="auto"
        className="flex-1 min-h-0 rounded border bg-muted"
      >
        <div className="min-w-full">
          <pre className="inline-block min-w-full whitespace-pre p-4 text-xs">
            {json}
          </pre>
        </div>
      </ScrollArea>
    </div>
  );
}

export interface ChatDebugSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatDebugSheet({ open, onOpenChange }: ChatDebugSheetProps) {
  const contextMap = useAIContextStore((s) => s.contextItems);
  const focusMap = useAIFocusStore((s) => s.focusItems);
  const mcpServersMap = useAIMCPServersStore((s) => s.servers);

  const contextItems = React.useMemo(() => {
    return Array.from(contextMap.values()).sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );
  }, [contextMap]);

  const focusItems = React.useMemo(() => {
    return Array.from(focusMap.values());
  }, [focusMap]);

  const tools = React.useMemo(() => {
    try {
      return useAIToolsStore.getState().serializeToolsForBackend();
    } catch {
      return [] as unknown[];
    }
  }, []);

  const mcpServers = React.useMemo(() => {
    try {
      return Array.from(mcpServersMap.values()).map((server) => ({
        id: server.id,
        name: server.name,
        transport: server.transport,
        tools: server.tools,
      }));
    } catch {
      return [] as unknown[];
    }
  }, [mcpServersMap]);

  const sections = React.useMemo(
    () => [
      { id: "context", label: "Context Items", value: contextItems },
      { id: "focus", label: "Focus Items", value: focusItems },
      { id: "tools", label: "Tools (for backend)", value: tools },
      { id: "mcp", label: "MCP Servers", value: mcpServers },
    ],
    [contextItems, focusItems, tools, mcpServers]
  );

  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-[800px] max-w-[90vw] flex-col gap-6 overflow-hidden px-6 sm:max-w-[800px]"
      >
        <SheetHeader className="gap-2 pb-2">
          <SheetTitle>Chat Debug Info</SheetTitle>
          <SheetDescription>
            Data that would be sent to the LLM on the next message
          </SheetDescription>
        </SheetHeader>

        <Tabs
          defaultValue={sections[0]?.id}
          className="flex flex-1 flex-col gap-4 overflow-hidden"
        >
          <TabsList className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="data-[state=active]:bg-background data-[state=active]:shadow"
              >
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {sections.map((section) => (
            <TabsContent
              key={section.id}
              value={section.id}
              className="flex flex-1 overflow-hidden"
            >
              <JsonBlock label={section.label} value={section.value} />
            </TabsContent>
          ))}
        </Tabs>

        <SheetFooter className="justify-end border-t pt-4">
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
