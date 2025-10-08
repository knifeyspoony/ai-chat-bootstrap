import {
  ArchiveRestore,
  Info,
  MemoryStick,
  PencilLine,
  Pin,
  PinOff,
  Save,
  Trash2,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";
import { Textarea } from "../../components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import type {
  CompressionArtifact,
  CompressionController,
} from "../../types/compression";
import { cn } from "../../utils";

interface ArtifactCardProps {
  artifact: CompressionArtifact;
  onUpdate: (artifactId: string, patch: Partial<CompressionArtifact>) => void;
  onDelete: (artifactId: string) => void;
  onTogglePin: (artifactId: string, nextPinned: boolean) => void;
}

const ArtifactCard: React.FC<ArtifactCardProps> = ({
  artifact,
  onUpdate,
  onDelete,
  onTogglePin,
}) => {
  const [title, setTitle] = useState(artifact.title ?? "");
  const [summary, setSummary] = useState(artifact.summary ?? "");

  // Sync local state when upstream artifact changes
  React.useEffect(() => {
    setTitle(artifact.title ?? "");
  }, [artifact.title, artifact.id]);

  React.useEffect(() => {
    setSummary(artifact.summary ?? "");
  }, [artifact.summary, artifact.id]);

  const editable = artifact.editable ?? true;

  const handleSave = () => {
    if (!editable) return;
    const patch: Partial<CompressionArtifact> = {};
    if (title !== artifact.title) patch.title = title || undefined;
    if (summary !== artifact.summary) patch.summary = summary;
    if (Object.keys(patch).length > 0) {
      patch.updatedAt = Date.now();
      onUpdate(artifact.id, patch);
    }
  };

  const handleReset = () => {
    setTitle(artifact.title ?? "");
    setSummary(artifact.summary ?? "");
  };

  const tokensSaved = artifact.tokensSaved;
  const pinned = artifact.pinned === true;
  const isPrimarySummary =
    (artifact.category ?? "").toLowerCase() === "primary_summary";

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[11px] uppercase">
              {artifact.category ?? "summary"}
            </Badge>
            {tokensSaved !== undefined && (
              <Badge className="text-[11px]" variant="outline">
                Saved {Math.max(Math.round(tokensSaved), 0).toLocaleString()}{" "}
                tokens
              </Badge>
            )}
            {pinned && (
              <Badge className="text-[11px]" variant="outline">
                Pinned
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">
            Artifact ID: {artifact.id}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isPrimarySummary ? (
            <TooltipProvider delayDuration={200} skipDelayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 cursor-default text-muted-foreground"
                    aria-label="Primary summaries are always sent to the LLM."
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  Primary summaries are always sent to the LLM and reused in future
                  compression summaries.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              type="button"
              size="icon"
              variant={pinned ? "default" : "ghost"}
              className="h-8 w-8 text-muted-foreground"
              onClick={() => onTogglePin(artifact.id, !pinned)}
              title={pinned ? "Unpin artifact" : "Pin artifact"}
            >
              {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>
          )}
          {editable && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground"
              onClick={handleSave}
              title="Save changes"
            >
              <Save className="h-4 w-4" />
            </Button>
          )}
          {editable && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground"
              onClick={handleReset}
              title="Revert changes"
            >
              <ArchiveRestore className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive"
            onClick={() => onDelete(artifact.id)}
            title="Delete artifact"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label
          className="text-xs font-medium text-foreground"
          htmlFor={`${artifact.id}-title`}
        >
          Title
        </label>
        <Input
          id={`${artifact.id}-title`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={!editable}
          placeholder="Optional title"
        />
      </div>

      <div className="space-y-2">
        <label
          className="text-xs font-medium text-foreground"
          htmlFor={`${artifact.id}-summary`}
        >
          Summary
        </label>
        <Textarea
          id={`${artifact.id}-summary`}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          disabled={!editable}
          rows={6}
          placeholder="Describe the condensed conversation context"
        />
      </div>
    </div>
  );
};

export interface CompressionArtifactsSheetProps {
  compression?: CompressionController;
  className?: string;
}

export const CompressionArtifactsSheet: React.FC<
  CompressionArtifactsSheetProps
> = ({ compression, className }) => {
  const [open, setOpen] = useState(false);
  const artifacts = compression?.artifacts;

  const orderedArtifacts = useMemo(() => {
    if (!artifacts || artifacts.length === 0) return [];
    const items = [...artifacts];
    const primaryIndex = items.findIndex(
      (artifact) => (artifact.category ?? "").toLowerCase() === "primary_summary"
    );
    let primary: CompressionArtifact | undefined;
    if (primaryIndex >= 0) {
      [primary] = items.splice(primaryIndex, 1);
    }
    const pinned = items.filter((artifact) => artifact.pinned === true);
    const unpinned = items.filter((artifact) => artifact.pinned !== true);
    const combined = [...pinned, ...unpinned];
    return primary ? [primary, ...combined] : combined;
  }, [artifacts]);

  const handleUpdate = (
    artifactId: string,
    patch: Partial<CompressionArtifact>
  ) => {
    if (!compression) return;
    compression.actions.updateArtifact(artifactId, patch);
  };

  const handleDelete = (artifactId: string) => {
    if (!compression) return;
    compression.actions.removeArtifact(artifactId);
  };

  const handleTogglePin = (artifactId: string, nextPinned: boolean) => {
    if (!compression) return;
    compression.actions.updateArtifact(artifactId, {
      pinned: nextPinned,
      updatedAt: Date.now(),
    });
  };

  const hasArtifacts = orderedArtifacts.length > 0;
  const artifactCount = orderedArtifacts.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:text-foreground",
            className
          )}
          title="Open compression artifacts"
        >
          <MemoryStick className="h-4 w-4" />
          {artifactCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {artifactCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex h-[70vh] max-h-[600px] flex-col gap-4 rounded-t-2xl border-t px-4 pb-4 pt-6 sm:px-6"
      >
        <SheetHeader>
          <SheetTitle>Compression Artifacts</SheetTitle>
          <SheetDescription>
            Review, edit, or remove summaries that stand in for older conversation turns.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4 pb-6">
            {hasArtifacts ? (
              orderedArtifacts.map((artifact) => (
                <ArtifactCard
                  key={artifact.id}
                  artifact={artifact}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
                <PencilLine className="h-8 w-8" />
                <p>
                  No compression artifacts yet. Once the context is summarised, they will appear here.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
