import { BugIcon } from "lucide-react";
import * as React from "react";
import { Button } from "../ui/button";
import { ChatDebugSheet } from "./chat-debug-sheet";

export function ChatDebugButton() {
  const [open, setOpen] = React.useState(false);

  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Open debug tools"
      >
        <BugIcon size={20} />
      </Button>
      <ChatDebugSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
