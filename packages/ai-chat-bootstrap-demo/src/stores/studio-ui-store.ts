"use client";
import { create } from "zustand";

export type StudioUIMode = "list" | "create" | "edit";

interface StudioUIState {
  activeNoteId: string | null;
  mode: StudioUIMode;
  setActiveNoteId: (id: string | null) => void;
  setMode: (m: StudioUIMode) => void;
  beginCreate: () => void;
  beginEdit: (id: string) => void;
  backToList: () => void;
}

export const useStudioUIStore = create<StudioUIState>((set) => ({
  activeNoteId: null,
  mode: "list",
  setActiveNoteId: (id) => set({ activeNoteId: id }),
  setMode: (m) => set({ mode: m }),
  beginCreate: () => set({ mode: "create", activeNoteId: null }),
  beginEdit: (id) => set({ mode: "edit", activeNoteId: id }),
  backToList: () => set({ mode: "list" }),
}));
