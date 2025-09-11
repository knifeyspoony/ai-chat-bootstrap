"use client";
import { create } from "zustand";

export type SourcesUIMode = "list" | "create" | "edit";

interface SourcesUIState {
  activeSourceId: string | null;
  mode: SourcesUIMode;
  setActiveSourceId: (id: string | null) => void;
  setMode: (m: SourcesUIMode) => void;
  beginCreate: () => void;
  beginEdit: (id: string) => void;
  backToList: () => void;
}

export const useSourcesUIStore = create<SourcesUIState>((set) => ({
  activeSourceId: null,
  mode: "list",
  setActiveSourceId: (id) => set({ activeSourceId: id }),
  setMode: (m) => set({ mode: m }),
  beginCreate: () => set({ mode: "create", activeSourceId: null }),
  beginEdit: (id) => set({ mode: "edit", activeSourceId: id }),
  backToList: () => set({ mode: "list" }),
}));
