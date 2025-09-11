"use client";
import { create } from "zustand";

export interface ToolResultItem {
  id: string;
  toolName: string;
  ts: number;
  data: unknown;
}

interface ToolResultsState {
  results: ToolResultItem[];
  pushResult: (
    item: Omit<ToolResultItem, "id" | "ts"> & { id?: string }
  ) => string;
  clear: () => void;
}

export const useToolResultsStore = create<ToolResultsState>(
  (
    set: (
      fn: (s: ToolResultsState) => Partial<ToolResultsState> | ToolResultsState
    ) => void
  ) => ({
    results: [],
    pushResult: (item: Omit<ToolResultItem, "id" | "ts"> & { id?: string }) => {
      const id = item.id || Math.random().toString(36).slice(2);
      const entry: ToolResultItem = {
        id,
        toolName: item.toolName,
        data: item.data,
        ts: Date.now(),
      };
      set((s: ToolResultsState) => ({
        results: [entry, ...s.results].slice(0, 8),
      }));
      return id;
    },
    clear: () => set(() => ({ results: [] })),
  })
);
