import { create } from "zustand";
import type { Suggestion } from "../types/chat";

export interface SuggestionsState {
  suggestions: Suggestion[];
  isLoading: boolean;
  error: string | null;

  // Pure actions (no side-effects)
  setSuggestions: (suggestions: Suggestion[]) => void;
  clearSuggestions: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSuggestionsStore = create<SuggestionsState>((set) => ({
  suggestions: [],
  isLoading: false,
  error: null,

  setSuggestions: (suggestions: Suggestion[]) =>
    set({ suggestions, error: null, isLoading: false }),

  clearSuggestions: () => set({ suggestions: [] }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setError: (error: string | null) => set({ error, isLoading: false }),
}));
