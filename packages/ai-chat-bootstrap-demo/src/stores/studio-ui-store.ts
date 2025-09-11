"use client";
import { create } from "zustand";

interface StudioUIState {
  activeNoteId: string | null;
  setActiveNoteId: (id: string | null) => void;
}

export const useStudioUIStore = create<StudioUIState>((set) => ({
  activeNoteId: null,
  setActiveNoteId: (id) => set({ activeNoteId: id }),
}));
