"use client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useNotesStore, type Note } from "@/stores/notes-store";
import { Check, MoreVertical, Pencil, StickyNote, Trash2 } from "lucide-react";
import React, { useEffect } from "react";
import { useStudioUIStore } from "../../stores/studio-ui-store";

export function StudioPanel() {
  const notesRecord = useNotesStore((s) => s.notes);
  const addNote = useNotesStore((s) => s.addNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const toggleShared = useNotesStore((s) => s.toggleSharedAsSource);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const notes = Object.values(notesRecord).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  const activeId = useStudioUIStore((s) => s.activeNoteId);
  const setActiveId = useStudioUIStore((s) => s.setActiveNoteId);
  const uiMode = useStudioUIStore((s) => s.mode);
  const setMode = useStudioUIStore((s) => s.setMode);
  const beginEdit = useStudioUIStore((s) => s.beginEdit);
  const backToList = useStudioUIStore((s) => s.backToList);
  const activeNote: Note | undefined = activeId
    ? notes.find((n) => n.id === activeId)
    : undefined;

  // Rename dialog state
  const [renameTarget, setRenameTarget] = React.useState<{
    id: string;
    value: string;
  } | null>(null);
  // No external ref needed; handled inside dialog component

  // Auto-select first note if none
  useEffect(() => {
    if (!activeId && notes.length) setActiveId(notes[0].id);
  }, [activeId, notes, setActiveId]);

  const create = () => {
    const id = addNote({ title: "New Note" });
    setActiveId(id);
    setMode("edit");
  };

  return (
    <div className="flex flex-col h-full">
      {uiMode === "list" && (
        <div className="p-2 border-b border-border/40 flex items-center gap-2 bg-card">
          <Button size="sm" className="h-8 text-[11px] px-3" onClick={create}>
            New Note
          </Button>
          <span className="ml-auto text-[10px] opacity-60 px-1">
            {notes.length}
          </span>
        </div>
      )}
      {uiMode !== "list" && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-background/50 text-xs">
          <Breadcrumb className="text-xs">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  asChild
                  className="cursor-pointer"
                  onClick={backToList}
                >
                  <span>Studio</span>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {uiMode === "create" ? "Add Note" : "Edit Note"}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {uiMode === "edit" && activeNote && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-auto text-red-500"
              onClick={() => {
                deleteNote(activeNote.id);
                backToList();
              }}
              aria-label="Delete note"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      {uiMode === "list" && (
        <ScrollArea className="flex-1 px-3 py-3">
          <div className="space-y-1">
            {notes.length === 0 && (
              <div className="text-xs text-muted-foreground px-1">
                No notes yet.
              </div>
            )}
            {notes.map((n) => {
              const active = n.id === activeId;
              return (
                <div key={n.id} className="relative group">
                  <Button
                    variant={active ? "secondary" : "ghost"}
                    onClick={() => {
                      beginEdit(n.id);
                      setActiveId(n.id);
                    }}
                    className={cn(
                      "w-full justify-start h-auto py-2 pr-8 pl-2 flex flex-col items-start gap-0.5 text-left text-xs relative",
                      active && "bg-accent/70"
                    )}
                  >
                    <span className="font-medium truncate w-full">
                      {n.title || "(Untitled)"}
                    </span>
                    <span className="text-[10px] opacity-60 flex gap-2 w-full">
                      {n.sharedAsSource && <span>Shared</span>}
                      <span>
                        {new Date(n.updatedAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 absolute top-1/2 -translate-y-1/2 right-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Note options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-40"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem
                          onClick={() =>
                            setRenameTarget({ id: n.id, value: n.title || "" })
                          }
                        >
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleShared(n.id)}>
                          <span className="flex items-center gap-2">
                            {n.sharedAsSource && <Check className="h-3 w-3" />}
                            <span>
                              {n.sharedAsSource ? "Unshare" : "Share as Source"}
                            </span>
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-500 focus:text-red-500"
                          onClick={() => {
                            deleteNote(n.id);
                            if (activeId === n.id) {
                              const remaining = notes.filter(
                                (m) => m.id !== n.id
                              );
                              setActiveId(remaining[0]?.id || null);
                            }
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
      {uiMode !== "list" && (
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-auto bg-card/90 border-t border-border/40">
          <Input
            placeholder="Title"
            value={activeNote?.title || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              if (!activeId) return;
              updateNote(activeId, { title: e.target.value });
            }}
            className="h-8 text-[12px]"
          />
          <div className="flex items-center gap-2">
            <Checkbox
              id={`note-share-${activeId}`}
              checked={!!activeNote?.sharedAsSource}
              onCheckedChange={() => activeId && toggleShared(activeId)}
            />
            <Label htmlFor={`note-share-${activeId}`} className="text-[11px]">
              Share as Source
            </Label>
          </div>
          <Textarea
            className="flex-1 resize-none text-xs leading-relaxed"
            placeholder="Write your note here..."
            value={activeNote?.body || ""}
            onChange={(e) => {
              if (!activeId) return;
              updateNote(activeId, { body: e.target.value });
            }}
          />
        </div>
      )}
      <RenameDialog
        target={renameTarget}
        setTarget={setRenameTarget}
        onSave={(id, value) => updateNote(id, { title: value })}
      />
    </div>
  );
}

// Collapsed rail (icon-only) for Studio panel
StudioPanel.rail = function StudioPanelRail({
  expand,
}: {
  expand: () => void;
}) {
  const notesRecord = useNotesStore((s) => s.notes);
  const addNote = useNotesStore((s) => s.addNote);
  const setActiveId = useStudioUIStore((s) => s.setActiveNoteId);
  const setMode = useStudioUIStore((s) => s.setMode);
  const beginEdit = useStudioUIStore((s) => s.beginEdit);
  const notes = Object.values(notesRecord).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="flex-1 flex flex-col items-center gap-2">
        {notes.map((n) => (
          <Button
            key={n.id}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={n.title}
            onClick={() => {
              beginEdit(n.id);
              setActiveId(n.id);
              setMode("edit");
              expand();
            }}
          >
            <StickyNote className="h-4 w-4" />
          </Button>
        ))}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 mt-auto"
        aria-label="New note"
        onClick={() => {
          const id = addNote({ title: "New Note" });
          setActiveId(id);
          setMode("edit");
          expand();
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Central dialog portal for renaming notes
// (Placed after component definitions to keep JSX near usage context.)
function RenameDialog({
  target,
  setTarget,
  onSave,
}: {
  target: { id: string; value: string } | null;
  setTarget: (t: { id: string; value: string } | null) => void;
  onSave: (id: string, value: string) => void;
}) {
  const [value, setValue] = React.useState(target?.value || "");
  useEffect(() => {
    setValue(target?.value || "");
  }, [target]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (target) setTimeout(() => inputRef.current?.focus(), 10);
  }, [target]);
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Rename Note</DialogTitle>
          <DialogDescription>Give this note a clear title.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="rename-note-input">Title</Label>
            <Input
              id="rename-note-input"
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (target) {
                    onSave(target.id, value.trim() || "Untitled");
                    setTarget(null);
                  }
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setTarget(null)}
            type="button"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (target) {
                onSave(target.id, value.trim() || "Untitled");
                setTarget(null);
              }
            }}
            type="button"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
