import { create } from "zustand";
import type { Suggestion, SuggestionsRequest } from "../types/chat";

export interface SuggestionsState {
  suggestions: Suggestion[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setSuggestions: (suggestions: Suggestion[]) => void;
  clearSuggestions: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchSuggestions: (request: SuggestionsRequest) => Promise<void>;
}

export const useSuggestionsStore = create<SuggestionsState>((set) => ({
  suggestions: [],
  isLoading: false,
  error: null,

  setSuggestions: (suggestions: Suggestion[]) =>
    set({ suggestions, error: null }),

  clearSuggestions: () => set({ suggestions: [] }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setError: (error: string | null) => set({ error, isLoading: false }),

  fetchSuggestions: async (request: SuggestionsRequest) => {
    try {
      set({ isLoading: true, error: null });

      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
      }

      const data = await response.json();
      set({ suggestions: data.suggestions, isLoading: false });
    } catch {
      set({
        error: "Failed to fetch suggestions",
        isLoading: false,
        suggestions: [],
      });
    }
  },
}));
