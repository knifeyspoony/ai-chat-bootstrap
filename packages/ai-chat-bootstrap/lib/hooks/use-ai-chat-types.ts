import type { PrepareSendMessagesRequest } from "ai";
import type { UIMessage } from "ai";
import type { SerializedMCPServer } from "../stores/mcp";
import type { ChatModelOption } from "../types/chat";
import type { CompressionConfig } from "../types/compression";
import type { UseSuggestionsOptions } from "./use-suggestions";

export interface DevToolsConfig {
  /**
   * Master switch to enable all dev tools features.
   * When enabled, turns on error logging and debug UI components.
   * Defaults to false (production-safe).
   */
  enabled?: boolean;
  /**
   * Show detailed error messages in the console.
   * Overrides the enabled setting if explicitly set.
   * Defaults to the value of `enabled`.
   */
  showErrorMessages?: boolean;
}

export interface ThreadTitleOptions {
  enabled?: boolean;
  api?: string;
  sampleCount?: number;
}

export interface ThreadsOptions {
  enabled?: boolean;
  id?: string;
  scopeKey?: string;
  autoCreate?: boolean;
  warnOnMissing?: boolean;
  title?: ThreadTitleOptions;
}

export interface SuggestionsOptions {
  enabled?: boolean;
  prompt?: string;
  count?: number;
  strategy?: UseSuggestionsOptions["strategy"];
  debounceMs?: number;
  api?: string;
  fetcher?: UseSuggestionsOptions["fetcher"];
}

export interface UseAIChatOptions {
  transport?: {
    api?: string;
    prepareSendMessagesRequest?: PrepareSendMessagesRequest<UIMessage>;
  };
  messages?: {
    systemPrompt?: string;
    initial?: UIMessage[];
  };
  threads?: ThreadsOptions;
  features?: {
    chainOfThought?: boolean;
    branching?: boolean;
  };
  mcp?: {
    enabled?: boolean;
    api?: string;
    servers?: SerializedMCPServer[];
  };
  models?: {
    available?: ChatModelOption[];
    initial?: string;
  };
  compression?: CompressionConfig;
  suggestions?: SuggestionsOptions;
  devTools?: DevToolsConfig;
}
