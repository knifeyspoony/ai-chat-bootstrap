"use client";
import { create } from "zustand";

export type SourceOrigin = "user" | "note" | "asset";

export interface Source {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: number;
  origin: SourceOrigin;
  noteId?: string; // link back if origin === 'note'
  assetId?: string; // future: if origin === 'asset'
}

interface SourcesState {
  sources: Record<string, Source>;
  addUserSource: (partial: {
    title: string;
    body?: string;
    tags?: string[];
  }) => string;
  addFromNote: (note: {
    id: string;
    title: string;
    body: string;
    tags: string[];
  }) => string;
  addFromAsset: (asset: { id: string; title: string; body: string }) => string;
  updateSource: (
    id: string,
    patch: Partial<Omit<Source, "id" | "origin">>
  ) => void;
  deleteSource: (id: string) => void;
  list: () => Source[];
}

export const useSourcesStore = create<SourcesState>((set, get) => ({
  sources: {},
  addUserSource: (partial) => {
    const id = `src_${Math.random().toString(36).slice(2)}`;
    const now = Date.now();
    const src: Source = {
      id,
      title: partial.title || "Untitled Source",
      body: partial.body || "",
      tags: partial.tags || [],
      createdAt: now,
      origin: "user",
    };
    set((s) => ({ sources: { ...s.sources, [id]: src } }));
    return id;
  },
  addFromNote: (note) => {
    const id = `src_note_${note.id}`;
    if (get().sources[id]) return id; // idempotent
    const src: Source = {
      id,
      title: note.title,
      body: note.body,
      tags: note.tags,
      createdAt: Date.now(),
      origin: "note",
      noteId: note.id,
    };
    set((s) => ({ sources: { ...s.sources, [id]: src } }));
    return id;
  },
  addFromAsset: (asset) => {
    const id = `src_asset_${asset.id}`;
    if (get().sources[id]) return id;
    const src: Source = {
      id,
      title: asset.title,
      body: asset.body,
      tags: [],
      createdAt: Date.now(),
      origin: "asset",
      assetId: asset.id,
    };
    set((s) => ({ sources: { ...s.sources, [id]: src } }));
    return id;
  },
  updateSource: (id, patch) => {
    set((s) => {
      const cur = s.sources[id];
      if (!cur) return s;
      return { sources: { ...s.sources, [id]: { ...cur, ...patch } } };
    });
  },
  deleteSource: (id) =>
    set((s) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _omit, ...rest } = s.sources;
      return { sources: rest };
    }),
  list: () =>
    Object.values(get().sources).sort((a, b) => b.createdAt - a.createdAt),
}));
