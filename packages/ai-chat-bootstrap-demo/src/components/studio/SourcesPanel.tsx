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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNotesStore } from "@/stores/notes-store";
import { useSourcesStore } from "@/stores/sources-store";
import { useSourcesUIStore } from "@/stores/sources-ui-store";
import { FileText, MoreVertical, Plus, Trash2 } from "lucide-react";
import React, { useEffect, useMemo } from "react";
// (No active note dependency here; direct sources are independent of studio notes)
import { useAIFocus, useAIFocusItem } from "ai-chat-bootstrap";

export function SourcesPanel() {
  // Raw notes map
  const notesRecord = useNotesStore((s) => s.notes);
  interface CombinedSource {
    id: string;
    title: string;
    body: string;
    origin: string;
  }
  const sourcesRecord = useSourcesStore((s) => s.sources);
  const directSources = useMemo(
    () =>
      Object.values(sourcesRecord).sort((a, b) => b.createdAt - a.createdAt),
    [sourcesRecord]
  );
  const sharedNoteSources: CombinedSource[] = Object.values(notesRecord)
    .filter((n) => n.sharedAsSource)
    .map((n) => ({
      id: `note_${n.id}`,
      title: n.title,
      body: n.body,
      origin: "note",
    }));
  const combined = [...directSources, ...sharedNoteSources];
  const { setFocus, focusItemsRecord } = useAIFocus();

  const addUserSource = useSourcesStore((s) => s.addUserSource);
  const updateSource = useSourcesStore((s) => s.updateSource);
  const deleteSource = useSourcesStore((s) => s.deleteSource);
  const uiMode = useSourcesUIStore((s) => s.mode);
  const setMode = useSourcesUIStore((s) => s.setMode);
  const beginEdit = useSourcesUIStore((s) => s.beginEdit);
  const backToList = useSourcesUIStore((s) => s.backToList);
  const activeSourceId = useSourcesUIStore((s) => s.activeSourceId);
  const setActiveSourceId = useSourcesUIStore((s) => s.setActiveSourceId);
  const activeSource = activeSourceId ? sourcesRecord[activeSourceId] : null;
  const [renameTarget, setRenameTarget] = React.useState<{
    id: string;
    value: string;
  } | null>(null);

  const createSource = () => {
    const id = addUserSource({ title: "Untitled Source" });
    if (!focusItemsRecord[id]) {
      setFocus(id, {
        id,
        label: "Untitled Source",
        data: { type: "source", excerpt: "" },
      });
    }
    setActiveSourceId(id);
    setMode("edit");
  };

  return (
    <div className="flex flex-col h-full">
      {uiMode === "list" && (
        <div className="p-2 border-b border-border/40 flex items-center gap-2 bg-card">
          <Button
            size="sm"
            className="h-8 text-[11px] px-3"
            onClick={createSource}
          >
            New Source
          </Button>
          <span className="ml-auto text-[10px] opacity-60 px-1">
            {combined.length}
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
                  <span>Sources</span>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {uiMode === "create" ? "Add Source" : "Edit Source"}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {uiMode === "edit" && activeSource && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-auto text-red-500"
              aria-label="Delete source"
              onClick={() => {
                deleteSource(activeSource.id);
                backToList();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      {uiMode === "list" && (
        <TooltipProvider delayDuration={0}>
          <ScrollArea className="flex-1 px-3 py-3">
            <div className="space-y-1">
              {combined.length === 0 && (
                <div className="text-xs text-muted-foreground px-1">
                  No sources yet.
                </div>
              )}
              {combined.map((s) => (
                <SourceRow
                  key={s.id}
                  source={s}
                  activeSourceId={activeSourceId}
                  setActiveSourceId={setActiveSourceId}
                  beginEdit={beginEdit}
                  deleteSource={deleteSource}
                  backToList={backToList}
                  setRenameTarget={setRenameTarget}
                />
              ))}
            </div>
          </ScrollArea>
        </TooltipProvider>
      )}
      {uiMode !== "list" && (
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-auto">
          <Input
            placeholder="Title"
            value={activeSource?.title || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              if (!activeSourceId) return;
              updateSource(activeSourceId, { title: e.target.value });
            }}
            className="h-8 text-[12px]"
          />
          <Textarea
            className="flex-1 resize-none text-xs leading-relaxed"
            placeholder="Content"
            value={activeSource?.body || ""}
            onChange={(e) => {
              if (!activeSourceId) return;
              updateSource(activeSourceId, { body: e.target.value });
            }}
          />
        </div>
      )}
      <SourceRenameDialog
        target={renameTarget}
        setTarget={setRenameTarget}
        onSave={(id, value) => updateSource(id, { title: value })}
      />
    </div>
  );
}

// Row component utilizing reactive focus updates via useAIFocusItem
function SourceRow({
  source,
  activeSourceId,
  setActiveSourceId,
  beginEdit,
  deleteSource,
  backToList,
  setRenameTarget,
}: {
  source: { id: string; title: string; body: string; origin: string };
  activeSourceId: string | null;
  setActiveSourceId: (id: string | null) => void;
  beginEdit: (id: string) => void;
  deleteSource: (id: string) => void;
  backToList: () => void;
  setRenameTarget: (t: { id: string; value: string } | null) => void;
}) {
  const { focusItemsRecord, setFocus, clearFocus } = useAIFocus();
  const id = source.id;
  const title = source.title || "(Untitled)";
  const body = source.body || "";
  const isNoteOrigin = id.startsWith("note_");
  const focused = !!focusItemsRecord[id];

  // Reactive sync: only keep updated when focused
  useAIFocusItem(
    id,
    () => {
      if (!focused) return null;
      return {
        label: title,
        data: {
          type: "source",
          origin: source.origin,
          excerpt: body.slice(0, 500),
        },
      };
    },
    [focused, title, body, source.origin]
  );

  return (
    <div className="relative group">
      <div
        className={`w-full flex items-center gap-2 rounded-md border border-transparent hover:border-border/50 transition-colors py-2 px-2 text-left text-xs ${
          focused ? "bg-secondary/60" : "bg-transparent"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            beginEdit(id.replace(/^note_/, ""));
            if (!isNoteOrigin) setActiveSourceId(id);
          }}
          className="flex-1 flex flex-col items-start gap-0.5 text-left"
        >
          <span className="font-medium truncate w-full">{title}</span>
          <span className="text-[10px] opacity-60 line-clamp-2 w-full">
            {body.slice(0, 120) || "(empty)"}
          </span>
        </button>
        <div className="flex items-center gap-1 ml-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-60 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
                aria-label="Source options"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-40"
              onClick={(e) => e.stopPropagation()}
            >
              {!isNoteOrigin && (
                <DropdownMenuItem
                  onClick={() => setRenameTarget({ id, value: title })}
                >
                  Rename
                </DropdownMenuItem>
              )}
              {!isNoteOrigin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-500 focus:text-red-500"
                    onClick={() => {
                      deleteSource(id);
                      if (activeSourceId === id) {
                        setActiveSourceId(null);
                        backToList();
                      }
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              {isNoteOrigin && (
                <DropdownMenuItem disabled>Linked Note Source</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <Checkbox
                checked={focused}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFocus(id, {
                      id,
                      label: title,
                      data: {
                        type: "source",
                        origin: source.origin,
                        excerpt: body.slice(0, 500),
                      },
                    });
                  } else {
                    clearFocus(id);
                  }
                }}
                aria-label={focused ? "Unfocus source" : "Focus source"}
              />
            </TooltipTrigger>
            <TooltipContent side="top">
              {focused ? "Remove from chat" : "Share with chat"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

function SourceRenameDialog({
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
          <DialogTitle>Rename Source</DialogTitle>
          <DialogDescription>
            Update the source title for clarity.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="rename-source-input">Title</Label>
            <Input
              id="rename-source-input"
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (target) {
                    onSave(target.id, value.trim() || "Untitled Source");
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
                onSave(target.id, value.trim() || "Untitled Source");
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

// Collapsed rail (icon-only) for Sources panel
SourcesPanel.rail = function SourcesPanelRail({
  expand,
}: {
  expand: () => void;
}) {
  const sourcesRecord = useSourcesStore((s) => s.sources);
  const beginEdit = useSourcesUIStore((s) => s.beginEdit);
  const setActiveSourceId = useSourcesUIStore((s) => s.setActiveSourceId);
  const createSource = useSourcesStore((s) => s.addUserSource);
  const setMode = useSourcesUIStore((s) => s.setMode);
  const { setFocus, focusItemsRecord, clearFocus } = useAIFocus();
  const sources = Object.values(sourcesRecord).sort(
    (a, b) => b.createdAt - a.createdAt
  );
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col items-center w-full gap-2">
        <div className="flex-1 flex flex-col items-center gap-2 w-full">
          {sources.map((s) => {
            const focused = !!focusItemsRecord[s.id];
            return (
              <Tooltip key={s.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={focused ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      if (focused) {
                        clearFocus(s.id);
                      } else {
                        setFocus(s.id, {
                          id: s.id,
                          label: s.title || "(Untitled)",
                          data: {
                            type: "source",
                            origin: s.origin,
                            excerpt: s.body.slice(0, 120),
                          },
                        });
                      }
                      expand();
                      beginEdit(s.id);
                      setActiveSourceId(s.id);
                      setMode("edit");
                    }}
                    aria-label={s.title}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {s.title || "(Untitled)"}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 mt-auto"
          aria-label="Add source"
          onClick={() => {
            createSource({ title: "Untitled Source" });
            expand();
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </TooltipProvider>
  );
};
