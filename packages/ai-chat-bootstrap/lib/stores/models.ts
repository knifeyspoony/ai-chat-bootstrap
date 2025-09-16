import { create } from "zustand";
import type { ChatModelOption } from "../types/chat";

interface SetModelsOptions {
  preferredId?: string;
}

export interface AIModelsStore {
  models: ChatModelOption[];
  selectedModelId?: string;
  setModels: (models: ChatModelOption[], options?: SetModelsOptions) => void;
  setSelectedModelId: (modelId: string | undefined) => void;
}

const normalizeModels = (models: ChatModelOption[]): ChatModelOption[] => {
  if (!Array.isArray(models) || models.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  const normalized: ChatModelOption[] = [];
  for (const model of models) {
    if (!model?.id || typeof model.id !== "string") continue;
    if (seen.has(model.id)) continue;
    seen.add(model.id);
    normalized.push({ ...model });
  }
  return normalized;
};

export const useAIModelsStore = create<AIModelsStore>((set, get) => ({
  models: [],
  selectedModelId: undefined,
  setModels: (models, options) => {
    const normalized = normalizeModels(models);
    const preferredId = options?.preferredId;
    let nextSelected = get().selectedModelId;

    const hasPreferred =
      preferredId && normalized.some((model) => model.id === preferredId);

    if (hasPreferred) {
      nextSelected = preferredId;
    } else if (nextSelected && !normalized.some((model) => model.id === nextSelected)) {
      nextSelected = normalized[0]?.id;
    } else if (!nextSelected && normalized.length > 0) {
      nextSelected = normalized[0]?.id;
    }

    if (normalized.length === 0) {
      nextSelected = preferredId ?? nextSelected;
    }

    set({ models: normalized, selectedModelId: nextSelected });
  },
  setSelectedModelId: (modelId) => {
    if (!modelId) {
      set({ selectedModelId: undefined });
      return;
    }
    const models = get().models;
    if (models.some((model) => model.id === modelId)) {
      set({ selectedModelId: modelId });
    }
  },
}));
