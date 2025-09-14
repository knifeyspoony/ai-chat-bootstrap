import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Pencil, Plus, Spool, Trash2 } from "lucide-react";
import * as React from "react";
import { useChatThreadsStore } from "../../stores/chat-threads";
import { cn } from "../../utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

export interface ChatThreadsButtonProps {
  scopeKey?: string;
  onSelectThread?: (threadId: string) => void;
  onCreateThread?: (threadId: string) => void;
  className?: string;
  label?: string;
}

const MAX_TITLE_CHARS = 24;
function formatTitle(raw?: string) {
  const base = raw?.trim() || "Untitled thread";
  if (base.length <= MAX_TITLE_CHARS)
    return { display: base, truncated: false };
  return {
    display: base.slice(0, MAX_TITLE_CHARS).replace(/\s+$/g, "") + "…",
    truncated: true,
  };
}

export function ChatThreadsButton({
  scopeKey,
  onSelectThread,
  onCreateThread,
  className,
  label = "Threads",
}: ChatThreadsButtonProps) {
  const {
    listThreads,
    activeThreadId,
    setActiveThread,
    createThread,
    renameThread,
    isLoaded,
    loadThreadMetas,
  } = useChatThreadsStore();
  // Subscribe specifically to metas map so the list updates on title changes
  const metas = useChatThreadsStore((s) => s.metas);

  React.useEffect(() => {
    if (!isLoaded) {
      loadThreadMetas(scopeKey).catch(() => {});
    }
  }, [isLoaded, loadThreadMetas, scopeKey]);

  const threads = React.useMemo(() => listThreads(scopeKey), [metas, listThreads, scopeKey]);

  const handleNew = () => {
    const t = createThread({ scopeKey });
    onCreateThread?.(t.id);
  };
  const handleSelect = (id: string) => {
    setActiveThread(id);
    onSelectThread?.(id);
  };
  const handleRename = (id: string) => {
    const current = threads.find((t) => t.id === id);
    setRenameState({ id, title: current?.title || "" });
  };
  const handleDelete = (id: string) => setDeleteId(id);

  const [renameState, setRenameState] = React.useState<
    { id: string; title: string } | undefined
  >();
  const [deleteId, setDeleteId] = React.useState<string | undefined>();
  const renameInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (renameState) setTimeout(() => renameInputRef.current?.focus(), 0);
  }, [renameState]);

  const submitRename = () => {
    if (!renameState) return;
    const next = renameState.title.trim();
    if (next) {
      // Attempt a lightweight rename: if thread not loaded, load then rename
      const store = useChatThreadsStore.getState();
      if (!store.getThreadIfLoaded(renameState.id)) {
        store
          .loadThread(renameState.id)
          .then(() => store.renameThread(renameState.id, next, { manual: true }))
          .catch(() => store.renameThread(renameState.id, next, { manual: true }));
      } else {
        renameThread(renameState.id, next, { manual: true });
      }
    }
    setRenameState(undefined);
  };

  const confirmDelete = () => {
    if (deleteId) {
      const wasActive = activeThreadId === deleteId;
      useChatThreadsStore
        .getState()
        .deleteThread(deleteId)
        .then(() => {
          // If we deleted active, emit selection for new active id
          if (wasActive) {
            const nextActive = useChatThreadsStore.getState().activeThreadId;
            if (nextActive) onSelectThread?.(nextActive);
          }
        })
        .catch(() => {
          // On failure, still try to reflect current active
          const nextActive = useChatThreadsStore.getState().activeThreadId;
          if (nextActive) onSelectThread?.(nextActive);
        });
    }
    setDeleteId(undefined);
  };

  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={300}>
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label={label}
                className={cn(
                  "px-2 py-1 rounded border bg-[var(--acb-chat-header-bg)] hover:bg-[var(--acb-chat-input-wrapper-bg)] transition-colors inline-flex items-center justify-center",
                  className
                )}
              >
                <Spool className="h-4 w-4" />
                <span className="sr-only">{label}</span>
              </button>
            </DropdownMenu.Trigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
        <DropdownMenu.Content
          className={cn(
            "min-w-[280px] rounded-md border bg-[var(--acb-chat-header-bg)] p-1 shadow-md z-50 text-sm"
          )}
          align="end"
        >
          <div className="max-h-72 overflow-y-auto">
            {threads.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                No threads yet
              </div>
            )}
            {threads.map((t) => {
              const { display, truncated } = formatTitle(t.title);
              return (
                <DropdownMenu.Item
                  key={t.id}
                  className={cn(
                    "group px-2 py-1.5 rounded-sm cursor-pointer outline-none flex flex-col gap-0.5 focus:bg-[var(--acb-chat-input-wrapper-bg)]",
                    activeThreadId === t.id &&
                      "bg-[var(--acb-chat-input-wrapper-bg)]"
                  )}
                  onSelect={(e) => {
                    e.preventDefault();
                    handleSelect(t.id);
                    setMenuOpen(false);
                  }}
                >
                  <div className="flex items-start w-full">
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      {truncated ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="block truncate font-medium"
                              aria-label={t.title}
                            >
                              {display}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs">
                            {t.title}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="block truncate font-medium">
                          {display}
                        </span>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="whitespace-nowrap">
                          {new Date(t.updatedAt).toLocaleString()}
                        </span>
                        {activeThreadId === t.id && (
                          <span
                            aria-label="Current thread"
                            className="inline-block rounded border border-emerald-500/40 bg-emerald-500/5 px-1 py-0.5 text-[9px] uppercase tracking-wide font-medium text-emerald-500"
                          >
                            current
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-[var(--acb-chat-input-wrapper-bg)]"
                            aria-label="Rename thread"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleRename(t.id);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Rename</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-destructive/30 text-destructive"
                            aria-label="Delete thread"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleDelete(t.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </DropdownMenu.Item>
              );
            })}
          </div>
          <DropdownMenu.Separator className="h-px my-1 bg-[var(--acb-chat-header-border)]" />
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              handleNew();
            }}
            className="px-2 py-1.5 rounded-sm cursor-pointer outline-none flex items-center gap-2 focus:bg-[var(--acb-chat-input-wrapper-bg)]"
          >
            <Plus className="h-3.5 w-3.5" /> New Thread
          </DropdownMenu.Item>
        </DropdownMenu.Content>
        <Dialog
          open={!!renameState}
          onOpenChange={(o) => !o && setRenameState(undefined)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename thread</DialogTitle>
              <DialogDescription>
                Update the title for this thread.
              </DialogDescription>
            </DialogHeader>
            <div>
              <input
                ref={renameInputRef}
                value={renameState?.title || ""}
                onChange={(e) =>
                  setRenameState((s) =>
                    s ? { ...s, title: e.target.value } : s
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitRename();
                  } else if (e.key === "Escape") {
                    setRenameState(undefined);
                  }
                }}
                className="w-full px-3 py-2 border rounded-md bg-background"
                placeholder="Thread title"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setRenameState(undefined)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitRename}
                disabled={!renameState?.title.trim()}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog
          open={!!deleteId}
          onOpenChange={(o) => !o && setDeleteId(undefined)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this thread?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The thread and its messages will
                be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenu.Root>
    </TooltipProvider>
  );
}
