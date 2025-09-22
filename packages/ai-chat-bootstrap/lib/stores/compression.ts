import type { UIMessage } from "ai";
import { create } from "zustand";
import {
  type CompressionArtifact,
  type CompressionConfig,
  type CompressionEvent,
  type CompressionModelMetadata,
  type CompressionPinnedMessage,
  type CompressionSnapshot,
  type CompressionUsage,
  type CompressionUsageUpdateOptions,
} from "../types/compression";

const MAX_EVENT_HISTORY = 100;

type PinOptions = {
  reason?: string;
  pinnedBy?: "user" | "system";
  pinnedAt?: number;
};

export interface CompressionStoreState {
  config: CompressionConfig;
  pinnedMessages: Map<string, CompressionPinnedMessage>;
  artifacts: Map<string, CompressionArtifact>;
  events: CompressionEvent[];
  modelMetadata: CompressionModelMetadata | null;
  usage: CompressionUsage | null;
  lastSnapshot: CompressionSnapshot | null;
  shouldCompress: boolean;
  overBudget: boolean;

  setConfig: (config: CompressionConfig) => void;

  pinMessage: (message: UIMessage, options?: PinOptions) => void;
  setPinnedMessages: (pins: CompressionPinnedMessage[]) => void;
  unpinMessage: (messageId: string) => void;
  clearPinnedMessages: () => void;

  addArtifact: (artifact: CompressionArtifact) => void;
  updateArtifact: (artifactId: string, patch: Partial<CompressionArtifact>) => void;
  removeArtifact: (artifactId: string) => void;
  setArtifacts: (artifacts: CompressionArtifact[]) => void;
  clearArtifacts: () => void;

  recordEvent: (event: CompressionEvent) => void;
  clearEvents: () => void;

  setModelMetadata: (metadata: CompressionModelMetadata | null) => void;
  setUsage: (
    usage: CompressionUsage | null,
    options?: CompressionUsageUpdateOptions
  ) => void;
  setSnapshot: (snapshot: CompressionSnapshot | null) => void;

  listPinnedMessages: () => CompressionPinnedMessage[];
  listArtifacts: () => CompressionArtifact[];
  getSnapshot: () => {
    pinnedMessages: CompressionPinnedMessage[];
    artifacts: CompressionArtifact[];
    events: CompressionEvent[];
    modelMetadata: CompressionModelMetadata | null;
    usage: CompressionUsage | null;
    snapshot: CompressionSnapshot | null;
  };

  reset: () => void;
}

const sortPinnedMessages = (
  map: Map<string, CompressionPinnedMessage>
): CompressionPinnedMessage[] => {
  return Array.from(map.values()).sort((a, b) => {
    if (a.pinnedAt !== b.pinnedAt) {
      return a.pinnedAt - b.pinnedAt;
    }
    return a.message.id.localeCompare(b.message.id);
  });
};

const defaultState = (): Omit<CompressionStoreState, "setConfig" | "pinMessage" | "setPinnedMessages" | "unpinMessage" | "clearPinnedMessages" | "addArtifact" | "updateArtifact" | "removeArtifact" | "setArtifacts" | "clearArtifacts" | "recordEvent" | "clearEvents" | "setModelMetadata" | "setUsage" | "setSnapshot" | "listPinnedMessages" | "listArtifacts" | "getSnapshot" | "reset"> => ({
  config: {},
  pinnedMessages: new Map<string, CompressionPinnedMessage>(),
  artifacts: new Map<string, CompressionArtifact>(),
  events: [],
  modelMetadata: null,
  usage: null,
  lastSnapshot: null,
  shouldCompress: false,
  overBudget: false,
});

export const useAICompressionStore = create<CompressionStoreState>((set, get) => ({
  ...defaultState(),

  setConfig: (config) => {
    set({ config });
  },

  pinMessage: (message, options) => {
    if (!message?.id) return;

    set((state) => {
      const next = new Map(state.pinnedMessages);
      const existing = next.get(message.id);
      const pinnedAt = options?.pinnedAt ?? Date.now();
      const pin: CompressionPinnedMessage = {
        id: message.id,
        message,
        pinnedAt,
        pinnedBy: options?.pinnedBy ?? existing?.pinnedBy ?? "user",
        reason: options?.reason ?? existing?.reason,
      };
      next.set(message.id, pin);
      return { pinnedMessages: next };
    });
  },

  setPinnedMessages: (pins) => {
    const normalized = new Map<string, CompressionPinnedMessage>();
    pins.forEach((pin) => {
      if (!pin?.id || !pin.message?.id) return;
      normalized.set(pin.id, {
        ...pin,
        pinnedAt: pin.pinnedAt ?? Date.now(),
      });
    });
    set({ pinnedMessages: normalized });
  },

  unpinMessage: (messageId) => {
    if (!messageId) return;
    set((state) => {
      if (!state.pinnedMessages.has(messageId)) return {};
      const next = new Map(state.pinnedMessages);
      next.delete(messageId);
      return { pinnedMessages: next };
    });
  },

  clearPinnedMessages: () => {
    set({ pinnedMessages: new Map() });
  },

  addArtifact: (artifact) => {
    if (!artifact?.id) return;
    set((state) => {
      const next = new Map(state.artifacts);
      next.set(artifact.id, { ...artifact });
      return { artifacts: next };
    });
  },

  updateArtifact: (artifactId, patch) => {
    if (!artifactId) return;
    set((state) => {
      const current = state.artifacts.get(artifactId);
      if (!current) return {};
      const next = new Map(state.artifacts);
      next.set(artifactId, { ...current, ...patch });
      return { artifacts: next };
    });
  },

  removeArtifact: (artifactId) => {
    if (!artifactId) return;
    set((state) => {
      if (!state.artifacts.has(artifactId)) return {};
      const next = new Map(state.artifacts);
      next.delete(artifactId);
      return { artifacts: next };
    });
  },

  setArtifacts: (artifacts) => {
    const next = new Map<string, CompressionArtifact>();
    artifacts.forEach((artifact) => {
      if (!artifact?.id) return;
      next.set(artifact.id, { ...artifact });
    });
    set({ artifacts: next });
  },

  clearArtifacts: () => {
    set({ artifacts: new Map() });
  },

  recordEvent: (event) => {
    if (!event) return;
    set((state) => {
      const next = [...state.events, event];
      if (next.length > MAX_EVENT_HISTORY) {
        next.splice(0, next.length - MAX_EVENT_HISTORY);
      }
      return { events: next };
    });
  },

  clearEvents: () => {
    set({ events: [] });
  },

  setModelMetadata: (metadata) => {
    set({ modelMetadata: metadata });
  },

  setUsage: (usage, options) => {
    set((state) => {
      const nextShouldCompress = options?.shouldCompress ?? (usage ? state.shouldCompress : false);
      const nextOverBudget = options?.overBudget ?? (usage ? state.overBudget : false);

      return {
        usage: usage ? { ...usage } : null,
        shouldCompress: nextShouldCompress,
        overBudget: nextOverBudget,
      };
    });

    if (options?.appendEvent && usage) {
      const message = options.eventMessage ?? "Compression usage updated";
      const event: CompressionEvent = {
        id: `usage-${Date.now()}`,
        type: "info",
        timestamp: Date.now(),
        message,
        payload: {
          usage,
        },
      };
      get().recordEvent(event);
    }
  },

  setSnapshot: (snapshot) => {
    set({ lastSnapshot: snapshot ? { ...snapshot } : null });
  },

  listPinnedMessages: () => {
    return sortPinnedMessages(get().pinnedMessages);
  },

  listArtifacts: () => {
    return Array.from(get().artifacts.values()).sort((a, b) => {
      const aTime = a.updatedAt ?? a.createdAt;
      const bTime = b.updatedAt ?? b.createdAt;
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return a.id.localeCompare(b.id);
    });
  },

  getSnapshot: () => {
    const state = get();
    return {
      pinnedMessages: sortPinnedMessages(state.pinnedMessages),
      artifacts: state.listArtifacts(),
      events: [...state.events],
      modelMetadata: state.modelMetadata ? { ...state.modelMetadata } : null,
      usage: state.usage ? { ...state.usage } : null,
      snapshot: state.lastSnapshot ? { ...state.lastSnapshot } : null,
    };
  },

  reset: () => {
    set(defaultState());
  },
}));
