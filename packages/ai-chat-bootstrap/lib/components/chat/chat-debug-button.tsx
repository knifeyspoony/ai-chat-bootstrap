import { BugIcon } from "lucide-react";
import * as React from "react";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { ChatDebugSheet } from "./chat-debug-sheet";

export function ChatDebugButton() {
  const [open, setOpen] = React.useState(false);

  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <>
      <TooltipProvider delayDuration={200} skipDelayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(true)}
              aria-label="Open debug tools"
            >
              <BugIcon size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Open debug tools</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ChatDebugSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
