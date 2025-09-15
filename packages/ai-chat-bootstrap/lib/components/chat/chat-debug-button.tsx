import { BugIcon } from "lucide-react";
import * as React from "react";
import { useAIContextStore } from "../../stores/context";
import { useAIFocusStore } from "../../stores/focus";
import { useAIToolsStore } from "../../stores/tools";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  const json = React.useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "<unserializable>";
    }
  }, [value]);
  const copy = () => navigator.clipboard?.writeText(json).catch(() => {});
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <Button size="sm" variant="outline" onClick={copy}>
          Copy JSON
        </Button>
      </div>
      <pre className="max-h-56 overflow-auto text-xs rounded bg-muted p-2 whitespace-pre-wrap">
        {json}
      </pre>
    </div>
  );
}

export function ChatDebugButton() {
  // We intentionally call hooks unconditionally (even in production) to satisfy
  // the rules-of-hooks linter; we then no-op render in production.
  const [open, setOpen] = React.useState(false);
  // Select stable store slices (Maps) to avoid new references each render
  const contextMap = useAIContextStore((s) => s.contextItems);
  const focusMap = useAIFocusStore((s) => s.focusItems);
  const toolsMap = useAIToolsStore((s) => s.tools);

  // Derive serializable snapshots memoized by map identity
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
      // Use store's serializer but only when tools map identity changes
      return useAIToolsStore.getState().serializeToolsForBackend();
    } catch {
      return [] as unknown[];
    }
  }, [toolsMap]);

  // Production build: do not expose debug UI
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <BugIcon size={20} />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chat Debug Info</DialogTitle>
            <DialogDescription>
              Data that would be sent to the LLM on the next message
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <JsonBlock label="Context Items" value={contextItems} />
            <JsonBlock label="Focus Items" value={focusItems} />
            <JsonBlock label="Tools (for backend)" value={tools} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
