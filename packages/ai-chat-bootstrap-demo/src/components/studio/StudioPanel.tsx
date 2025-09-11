"use client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotesStore, type Note } from "@/stores/notes-store";
import { Pencil, StickyNote } from "lucide-react";
import { useEffect } from "react";
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
  const activeNote: Note | undefined = activeId
    ? notes.find((n) => n.id === activeId)
    : undefined;

  // Auto-select first note if none
  useEffect(() => {
    if (!activeId && notes.length) setActiveId(notes[0].id);
  }, [activeId, notes, setActiveId]);

  const create = () => {
    const id = addNote({ title: "New Note" });
    setActiveId(id);
  };
  const createShared = () => {
    const id = addNote({ title: "New Source" });
    toggleShared(id, true);
    setActiveId(id);
  };

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-background/40">
        <Button size="sm" onClick={create} className="h-7 text-xs px-3">
          New
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={createShared}
          className="h-7 text-xs px-3"
        >
          New Source
        </Button>
      </div>
      <div className="flex-1 grid grid-rows-[150px_1fr] min-h-0">
        {/* Notes list */}
        <ScrollArea className="border-b border-border/40">
          <div className="p-3 space-y-1">
            {notes.length === 0 && (
              <div className="text-xs text-muted-foreground">No notes yet.</div>
            )}
            {notes.map((n) => {
              const active = n.id === activeId;
              return (
                <Button
                  key={n.id}
                  variant={active ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start h-auto py-2 px-2 flex flex-col items-start gap-0.5 text-left text-xs",
                    active && "bg-accent/70"
                  )}
                  onClick={() => setActiveId(n.id)}
                >
                  <div className="font-medium truncate w-full">
                    {n.title || "(Untitled)"}
                  </div>
                  <div className="text-[10px] opacity-60 flex gap-2 w-full">
                    <span>{n.sharedAsSource ? "Shared" : "Private"}</span>
                    <span>
                      {new Date(n.updatedAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
        {/* Editor */}
        <div className="flex flex-col overflow-hidden">
          {!activeNote && (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
              Select a note or create one.
            </div>
          )}
          {activeNote && (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-muted/10">
                <input
                  className="flex-1 bg-background/40 text-sm outline-none border rounded px-2 py-1 h-8 focus-visible:ring-1 focus-visible:ring-ring"
                  value={activeNote.title}
                  placeholder="Title"
                  onChange={(e) =>
                    updateNote(activeNote.id, { title: e.target.value })
                  }
                />
                <label className="flex items-center gap-1 text-[11px] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={activeNote.sharedAsSource}
                    onChange={() => toggleShared(activeNote.id)}
                  />
                  Share
                </label>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteNote(activeNote.id)}
                  className="h-7 text-[11px]"
                >
                  Delete
                </Button>
              </div>
              <textarea
                className="flex-1 resize-none p-4 text-xs leading-relaxed bg-background outline-none border-0 focus-visible:ring-0"
                value={activeNote.body}
                placeholder="Write your note here..."
                onChange={(e) =>
                  updateNote(activeNote.id, { body: e.target.value })
                }
              />
            </div>
          )}
        </div>
      </div>
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
              setActiveId(n.id);
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
          expand();
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
};
