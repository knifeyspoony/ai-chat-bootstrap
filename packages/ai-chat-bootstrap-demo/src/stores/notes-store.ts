"use client";
import { create } from "zustand";

export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  sharedAsSource: boolean;
  updatedAt: number;
}

interface NotesState {
  notes: Record<string, Note>;
  addNote: (partial?: Partial<Pick<Note, "title" | "body" | "tags">>) => string;
  updateNote: (id: string, patch: Partial<Omit<Note, "id">>) => void;
  deleteNote: (id: string) => void;
  toggleSharedAsSource: (id: string, value?: boolean) => void;
  list: () => Note[];
  listShared: () => Note[];
}

export const useNotesStore = create<NotesState>(
  (
    set: (fn: (state: NotesState) => Partial<NotesState> | NotesState) => void,
    get: () => NotesState
  ) => ({
    notes: {},
    addNote: (partial?: Partial<Pick<Note, "title" | "body" | "tags">>) => {
      const id = Math.random().toString(36).slice(2);
      const now = Date.now();
      const note: Note = {
        id,
        title: partial?.title || "Untitled",
        body: partial?.body || "",
        tags: partial?.tags || [],
        sharedAsSource: false,
        updatedAt: now,
      };
      set((s: NotesState) => ({ notes: { ...s.notes, [id]: note } }));
      return id;
    },
    updateNote: (id: string, patch: Partial<Omit<Note, "id">>) => {
      set((s: NotesState) => {
        const current = s.notes[id];
        if (!current) return s;
        return {
          notes: {
            ...s.notes,
            [id]: { ...current, ...patch, updatedAt: Date.now() },
          },
        };
      });
    },
    deleteNote: (id: string) =>
      set((s: NotesState) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _omit, ...rest } = s.notes;
        return { notes: rest } as Partial<NotesState>;
      }),
    toggleSharedAsSource: (id: string, value?: boolean) => {
      set((s: NotesState) => {
        const current = s.notes[id];
        if (!current) return s;
        const next = {
          ...current,
          sharedAsSource: value ?? !current.sharedAsSource,
          updatedAt: Date.now(),
        };
        return { notes: { ...s.notes, [id]: next } };
      });
    },
    list: () =>
      (Object.values(get().notes) as Note[]).sort(
        (a, b) => b.updatedAt - a.updatedAt
      ),
    listShared: () =>
      get()
        .list()
        .filter((n: Note) => n.sharedAsSource),
  })
);
