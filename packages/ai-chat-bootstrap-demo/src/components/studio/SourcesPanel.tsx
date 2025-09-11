"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNotesStore } from "@/stores/notes-store";
import { useSourcesStore } from "@/stores/sources-store";
import { useSourcesUIStore } from "@/stores/sources-ui-store";
import { ChevronLeft, FileText, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
// (No active note dependency here; direct sources are independent of studio notes)
import { useAIFocus } from "ai-chat-bootstrap";

export function SourcesPanel() {
  // Use raw notes map to avoid calling derived functions inside selector (prevents snapshot loop)
  const notesRecord = useNotesStore((s) => s.notes);
  interface CombinedSource {
    id: string;
    title: string;
    body: string;
    origin: string;
  }
  // Select only raw sources map; derive sorted list locally to keep selector pure (prevents snapshot loop)
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
  const { setFocus, clearFocus, focusItemsRecord } = useAIFocus();

  const toggleFocus = (id: string, title: string, body: string) => {
    if (focusItemsRecord[id]) {
      clearFocus(id);
    } else {
      setFocus(id, {
        id,
        label: title || "(Untitled)",
        data: { type: "note", excerpt: body.slice(0, 500) },
      });
    }
  };

  const addUserSource = useSourcesStore((s) => s.addUserSource);
  const updateSource = useSourcesStore((s) => s.updateSource);
  const deleteSource = useSourcesStore((s) => s.deleteSource);
  const uiMode = useSourcesUIStore((s) => s.mode);
  const setMode = useSourcesUIStore((s) => s.setMode);
  // const beginCreate = useSourcesUIStore((s) => s.beginCreate);
  const beginEdit = useSourcesUIStore((s) => s.beginEdit);
  const backToList = useSourcesUIStore((s) => s.backToList);
  const activeSourceId = useSourcesUIStore((s) => s.activeSourceId);
  const setActiveSourceId = useSourcesUIStore((s) => s.setActiveSourceId);

  const activeSource = activeSourceId ? sourcesRecord[activeSourceId] : null;

  const createSource = () => {
    const id = addUserSource({ title: "Untitled Source" });
    setActiveSourceId(id);
    setMode("edit");
  };

  return (
    <div className="flex flex-col h-full">
      {uiMode === "list" && (
        <div className="p-2 border-b border-border/40 flex items-center gap-2 bg-background/40">
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
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={backToList}
            aria-label="Back to sources list"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="opacity-70">Sources</span>
          <span className="opacity-40">/</span>
          <span>{uiMode === "create" ? "Add Source" : "Edit Source"}</span>
          {uiMode === "edit" && activeSource && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-auto text-red-500"
              onClick={() => {
                deleteSource(activeSource.id);
                backToList();
              }}
              aria-label="Delete source"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      {uiMode === "list" && (
        <ScrollArea className="flex-1 px-3 py-3">
          <div className="space-y-1">
            {combined.length === 0 && (
              <div className="text-xs text-muted-foreground px-1">
                No sources yet.
              </div>
            )}
            {combined.map((s) => {
              const id = s.id;
              const title = s.title || "(Untitled)";
              const body = s.body || "";
              const focused = !!focusItemsRecord[id];
              return (
                <Button
                  key={id}
                  variant={focused ? "secondary" : "ghost"}
                  onClick={() => {
                    toggleFocus(id, title, body);
                    beginEdit(id);
                    setActiveSourceId(id);
                  }}
                  className="w-full justify-start h-auto py-2 px-2 flex flex-col items-start gap-0.5 text-left text-xs"
                >
                  <span className="font-medium truncate w-full">{title}</span>
                  <span className="text-[10px] opacity-60 line-clamp-2 w-full">
                    {body.slice(0, 120) || "(empty)"}
                  </span>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
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
          <textarea
            className="flex-1 resize-none p-3 text-xs leading-relaxed bg-background outline-none border rounded-md focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Content"
            value={activeSource?.body || ""}
            onChange={(e) => {
              if (!activeSourceId) return;
              updateSource(activeSourceId, { body: e.target.value });
            }}
          />
        </div>
      )}
    </div>
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
            const id = createSource({ title: "Untitled Source" });
            setActiveSourceId(id);
            setMode("edit");
            expand();
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </TooltipProvider>
  );
};
