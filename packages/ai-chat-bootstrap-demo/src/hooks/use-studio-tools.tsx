"use client";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { useNotesStore } from "@/stores/notes-store";
import { useAIFrontendTool } from "ai-chat-bootstrap";
import {
  AlertCircleIcon,
  PlusIcon,
  Share2Icon,
  StickyNoteIcon,
  Trash2Icon,
} from "lucide-react";
import { z } from "zod";

/**
 * Registers Studio note management frontend tools:
 *  - create_note: create a new note (optionally shared)
 *  - append_note: append content to an existing (or new) note
 *  - delete_note: delete a note by id (with optional shared requirement)
 *
 * Keeps heavy tool registration logic out of the page component.
 */
export function useStudioTools() {
  const addNote = useNotesStore((s) => s.addNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const toggleShared = useNotesStore((s) => s.toggleSharedAsSource);
  const deleteNote = useNotesStore((s) => s.deleteNote);

  /* ----------------------- create_note ----------------------- */
  interface CreateNoteResult {
    id: string;
    title: string;
    shared: boolean;
    length: number;
    message: string;
  }
  useAIFrontendTool({
    name: "create_note",
    description:
      "Create a new studio note with title and body (optionally share it as a source)",
    parameters: z.object({
      title: z
        .string()
        .min(1)
        .default("Untitled Note")
        .describe("Title for the note"),
      body: z
        .string()
        .min(1)
        .describe("Markdown/plaintext body content for the note"),
      share: z
        .boolean()
        .default(false)
        .describe("Whether to immediately share this note as a source"),
    }),
    execute: async (params: unknown) => {
      const { title, body, share } = params as {
        title: string;
        body: string;
        share: boolean;
      };
      const id = addNote({ title, body });
      if (share) toggleShared(id, true);
      return {
        id,
        title,
        shared: share,
        length: body.length,
        message: `Created note '${title}' (${body.length} chars)${
          share ? " and shared as a source" : ""
        }.`,
      } satisfies CreateNoteResult;
    },
    render: (result: CreateNoteResult) => (
      <Alert>
        <StickyNoteIcon className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-1">
          {result.title}
          {result.shared && (
            <Share2Icon className="h-3 w-3 text-primary shrink-0" />
          )}
        </AlertTitle>
      </Alert>
    ),
  });

  /* ----------------------- append_note ----------------------- */
  interface AppendNoteResult {
    id: string;
    created?: boolean;
    appended?: boolean;
    addedLength?: number;
    newLength?: number;
    length?: number; // initial length when created
    error?: string;
  }
  useAIFrontendTool({
    name: "append_note",
    description:
      "Append content to an existing note by id (or create it if missing)",
    parameters: z.object({
      id: z.string().describe("Existing note id to append to"),
      content: z.string().min(1).describe("Content to append to the note body"),
      separator: z
        .string()
        .default("\n\n")
        .describe("Separator between old and new content"),
      createIfMissing: z
        .boolean()
        .default(true)
        .describe("If true, create a new note if id not found"),
    }),
    execute: async (params: unknown) => {
      const { id, content, separator, createIfMissing } = params as {
        id: string;
        content: string;
        separator: string;
        createIfMissing: boolean;
      };
      const notes = useNotesStore.getState().notes; // always fresh snapshot
      const existing = notes[id];
      if (!existing && !createIfMissing) {
        return {
          id,
          appended: false,
          error: "Note not found",
        } satisfies AppendNoteResult;
      }
      if (!existing && createIfMissing) {
        const newId = addNote({ title: `Note ${id}`, body: content });
        return {
          id: newId,
          created: true,
          appended: false,
          length: content.length,
          message: `Created new note ${newId} with initial content (${content.length} chars)`,
        } as AppendNoteResult & { message: string };
      }
      const newBody = existing!.body
        ? `${existing!.body}${separator}${content}`
        : content;
      updateNote(id, { body: newBody });
      return {
        id,
        appended: true,
        addedLength: content.length,
        newLength: newBody.length,
        message: `Appended ${content.length} chars to note ${id}`,
      } as AppendNoteResult & { message: string };
    },
    render: (result: AppendNoteResult) => (
      <Alert variant={result.error ? "destructive" : "default"}>
        {result.error ? (
          <>
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-1">
              {result.error}
            </AlertTitle>
          </>
        ) : result.created ? (
          <>
            <StickyNoteIcon className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-1">
              Created: {result.id}
            </AlertTitle>
          </>
        ) : (
          <>
            <PlusIcon className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-1">
              {result.id} (+{result.addedLength} chars)
            </AlertTitle>
          </>
        )}
      </Alert>
    ),
  });

  /* ----------------------- delete_note ----------------------- */
  interface DeleteNoteResult {
    id: string;
    deleted: boolean;
    wasShared?: boolean;
    error?: string;
  }
  useAIFrontendTool({
    name: "delete_note",
    description:
      "Delete a note by its id. Provide the exact id previously returned when creating or listing notes.",
    parameters: z.object({
      id: z.string().describe("ID of the note to delete"),
      requireShared: z
        .boolean()
        .default(false)
        .describe(
          "If true, only delete if the note is currently shared as a source"
        ),
    }),
    execute: async (params: unknown) => {
      const { id, requireShared } = params as {
        id: string;
        requireShared: boolean;
      };
      const notes = useNotesStore.getState().notes;
      const existing = notes[id];
      if (!existing)
        return {
          id,
          deleted: false,
          error: "Note not found",
        } satisfies DeleteNoteResult;
      if (requireShared && !existing.sharedAsSource)
        return {
          id,
          deleted: false,
          wasShared: false,
          error: "Note is not shared (requireShared=true)",
        } satisfies DeleteNoteResult;
      const wasShared = existing.sharedAsSource;
      deleteNote(id);
      return { id, deleted: true, wasShared } satisfies DeleteNoteResult;
    },
    render: (result: DeleteNoteResult) => (
      <Alert variant={result.error ? "destructive" : "default"}>
        {result.error ? (
          <>
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-1">
              {result.error}
            </AlertTitle>
          </>
        ) : (
          <>
            <Trash2Icon className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-1">
              Deleted: {result.id}
            </AlertTitle>
          </>
        )}
      </Alert>
    ),
  });
}
