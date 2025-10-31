import type { ChatStatus } from "ai";
import { PlusIcon, RotateCcwIcon, SparklesIcon, XIcon } from "lucide-react";
import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "../../components/ai-elements/prompt-input";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import type { ChatModelOption, FocusItem, Suggestion } from "../../types/chat";
import type { CompressionController } from "../../types/compression";
import { cn } from "../../utils";
import { CompressionArtifactsSheet } from "./compression-artifacts-sheet";
import { CompressionUsageIndicator } from "./compression-usage-indicator";

// Pure suggestions button implementation
interface PureSuggestionsButtonProps {
  suggestions?: Suggestion[];
  suggestionsCount?: number;
  onSuggestionClick?: (suggestion: Suggestion) => void;
}

const PureSuggestionsButton = ({
  suggestions = [],
  suggestionsCount = 3,
  onSuggestionClick,
}: PureSuggestionsButtonProps) => {
  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={300}>
      <DropdownMenu modal={false}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <PromptInputButton
                type="button"
                disabled={!suggestions || suggestions.length === 0}
                className={cn(
                  suggestions &&
                    suggestions.length > 0 &&
                    "text-primary hover:text-primary"
                )}
                aria-label="Open AI suggestions"
              >
                <SparklesIcon className="h-4 w-4" />
              </PromptInputButton>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">AI Suggestions</TooltipContent>
        </Tooltip>
        {suggestions && suggestions.length > 0 && (
          <DropdownMenuContent
            align="end"
            side="top"
            className="w-80"
            sideOffset={8}
          >
            <DropdownMenuLabel>AI Suggestions</DropdownMenuLabel>
            {suggestions
              .slice(0, Math.min(Math.max(suggestionsCount, 1), 10))
              .map((suggestion, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={() => onSuggestionClick?.(suggestion)}
                  className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                >
                  <div className="flex flex-col gap-1 py-1">
                    <span className="font-medium leading-tight">
                      {suggestion.shortSuggestion}
                    </span>
                    {suggestion.shortSuggestion !== suggestion.longSuggestion && (
                      <span className="text-xs text-muted-foreground leading-tight">
                        {suggestion.longSuggestion}
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    </TooltipProvider>
  );
};

// Memoized suggestions button - only re-renders when suggestions change
const SuggestionsButton = memo(
  PureSuggestionsButton,
  (prevProps, nextProps) => {
    // Only re-render if suggestions array reference changes
    if (prevProps.suggestions !== nextProps.suggestions) return false;
    if (prevProps.suggestionsCount !== nextProps.suggestionsCount) return false;

    // Skip function comparison for better performance
    return true;
  }
);

// Pure model selector implementation
interface PureModelSelectorProps {
  models?: ChatModelOption[];
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;
  disabled?: boolean;
}

const PureModelSelector = ({
  models = [],
  selectedModelId,
  onModelChange,
  disabled = false,
}: PureModelSelectorProps) => {
  const modelOptions = Array.isArray(models) ? models : [];
  const hasModelOptions = modelOptions.length > 0;

  if (!hasModelOptions) {
    return null;
  }

  const selectModelValue =
    selectedModelId &&
    modelOptions.some((option) => option.id === selectedModelId)
      ? selectedModelId
      : modelOptions[0]?.id;

  return (
    <PromptInputModelSelect
      value={selectModelValue}
      onValueChange={(value) => onModelChange?.(value)}
      disabled={disabled}
    >
      <PromptInputModelSelectTrigger className="h-8 px-2 text-sm">
        <PromptInputModelSelectValue placeholder="Select a model" />
      </PromptInputModelSelectTrigger>
      <PromptInputModelSelectContent align="start">
        {modelOptions.map((option) => (
          <PromptInputModelSelectItem key={option.id} value={option.id}>
            <div className="flex flex-col gap-0.5 py-1">
              <span className="text-sm font-medium leading-tight">
                {option.label ?? option.id}
              </span>
            </div>
          </PromptInputModelSelectItem>
        ))}
      </PromptInputModelSelectContent>
    </PromptInputModelSelect>
  );
};

// Memoized model selector - only re-renders when model data changes
const ModelSelector = memo(PureModelSelector, (prevProps, nextProps) => {
  // Only re-render if model-related props change
  if (prevProps.models !== nextProps.models) return false;
  if (prevProps.selectedModelId !== nextProps.selectedModelId) return false;
  if (prevProps.disabled !== nextProps.disabled) return false;

  // Skip function comparison for better performance
  return true;
});

// Pure attach button implementation
interface PureAttachButtonProps {
  onAttach?: () => void;
  disabled?: boolean;
}

const PureAttachButton = ({
  onAttach,
  disabled = false,
}: PureAttachButtonProps) => {
  if (!onAttach) {
    return null;
  }

  return (
    <PromptInputButton onClick={onAttach} disabled={disabled}>
      <PlusIcon className="h-4 w-4" />
    </PromptInputButton>
  );
};

// Memoized attach button - only re-renders when disabled state changes
const AttachButton = memo(PureAttachButton, (prevProps, nextProps) => {
  if (prevProps.disabled !== nextProps.disabled) return false;

  // Skip function comparison for better performance
  return true;
});

// Pure toolbar left section (model + attach button)
interface PureToolbarLeftProps {
  models?: ChatModelOption[];
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;
  onAttach?: () => void;
  disabled?: boolean;
  compression?: CompressionController;
}

const PureToolbarLeft = ({
  models,
  selectedModelId,
  onModelChange,
  onAttach,
  disabled = false,
  compression,
}: PureToolbarLeftProps) => {
  const compressionEnabled = compression?.config?.enabled === true;

  return (
    <div className="flex items-center gap-1">
      <ModelSelector
        models={models}
        selectedModelId={selectedModelId}
        onModelChange={onModelChange}
        disabled={disabled}
      />
      {compressionEnabled && (
        <CompressionUsageIndicator compression={compression} />
      )}
      <PromptInputTools>
        <AttachButton onAttach={onAttach} disabled={disabled} />
      </PromptInputTools>
    </div>
  );
};

// Memoized toolbar left section
const ToolbarLeft = memo(PureToolbarLeft, (prevProps, nextProps) => {
  if (prevProps.models !== nextProps.models) return false;
  if (prevProps.selectedModelId !== nextProps.selectedModelId) return false;
  if (prevProps.disabled !== nextProps.disabled) return false;
  if (prevProps.compression !== nextProps.compression) return false;

  // Skip function comparison for better performance
  return true;
});

// Pure toolbar right section (suggestions + send button)
interface PureToolbarRightProps {
  status?: ChatStatus;
  submitDisabled?: boolean;
  hasContent?: boolean;
  enableSuggestions?: boolean;
  suggestions?: Suggestion[];
  suggestionsCount?: number;
  onSuggestionClick?: (suggestion: Suggestion) => void;
  compression?: CompressionController;
  onStop?: () => void;
}

const PureToolbarRight = ({
  status,
  submitDisabled = false,
  hasContent = false,
  enableSuggestions = false,
  suggestions = [],
  suggestionsCount = 3,
  onSuggestionClick,
  compression,
  onStop,
}: PureToolbarRightProps) => {
  const hasCompressionArtifacts = Boolean(
    compression && (compression.artifacts.length > 0 || compression.snapshot)
  );
  const canStop = status === "streaming" || status === "submitted";
  const showStop = canStop && typeof onStop === "function";
  const submitStatus =
    showStop && status === "submitted" ? ("streaming" as ChatStatus) : status;

  return (
    <div className="flex items-center gap-1">
      {hasCompressionArtifacts && (
        <CompressionArtifactsSheet compression={compression} />
      )}

      {enableSuggestions && (
        <SuggestionsButton
          suggestions={suggestions}
          suggestionsCount={suggestionsCount}
          onSuggestionClick={onSuggestionClick}
        />
      )}

      <PromptInputSubmit
        status={submitStatus}
        disabled={showStop ? false : submitDisabled || !hasContent}
        onClick={
          showStop
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
                onStop();
              }
            : undefined
        }
        type={showStop ? "button" : undefined}
        aria-label={showStop ? "Stop response" : undefined}
        title={showStop ? "Stop response" : undefined}
      />
    </div>
  );
};

// Memoized toolbar right section
const ToolbarRight = memo(PureToolbarRight, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.submitDisabled !== nextProps.submitDisabled) return false;
  if (prevProps.hasContent !== nextProps.hasContent) return false;
  if (prevProps.enableSuggestions !== nextProps.enableSuggestions) return false;
  if (prevProps.suggestions !== nextProps.suggestions) return false;
  if (prevProps.suggestionsCount !== nextProps.suggestionsCount) return false;
  if (prevProps.compression !== nextProps.compression) return false;

  // Skip function comparison for better performance
  return true;
});

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onAttach?: () => void;
  onRetry?: () => void;
  /** Invoked when the stop button is pressed during streaming */
  onStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  // Submit-specific disabled state (separate from general disabled)
  submitDisabled?: boolean;
  status?: ChatStatus;
  maxRows?: number;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  models?: ChatModelOption[];
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;

  // Suggestions props
  enableSuggestions?: boolean;
  suggestions?: Suggestion[];
  suggestionsCount?: number;
  onSuggestionClick?: (suggestion: Suggestion) => void;

  // Performance props - passed from parent to avoid store subscriptions
  allFocusItems?: FocusItem[];
  clearFocus?: (id: string) => void;
  error?: string | null;
  setError?: (error: string | null) => void;

  compression?: CompressionController;
}

const ChatInputImpl = ({
  value,
  onChange,
  onSubmit,
  onAttach,
  onRetry,
  placeholder = "Type your message...",
  disabled = false,
  submitDisabled,
  status,
  maxRows = 4,
  className,
  onKeyDown,
  models,
  selectedModelId,
  onModelChange,
  onStop,

  // Suggestions props
  enableSuggestions = false,
  suggestions = [],
  suggestionsCount = 3,
  onSuggestionClick,

  // Performance props - passed from parent to avoid store subscriptions
  allFocusItems = [],
  clearFocus,
  error,
  setError,
  compression,
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Track current value in ref to avoid re-renders during typing
  const currentValueRef = useRef<string>(value || "");
  const hasContentRef = useRef<boolean>(Boolean(value?.trim()));

  // Update ref when controlled value changes from parent
  useEffect(() => {
    if (value !== undefined) {
      currentValueRef.current = value;
      hasContentRef.current = Boolean(value.trim());
      if (textareaRef.current && textareaRef.current.value !== value) {
        textareaRef.current.value = value;
      }
    }
  }, [value]);

  // Model computations are now handled by the memoized ModelSelector component

  // Memoize focus items rendering
  const focusItemElements = useMemo(
    () =>
      allFocusItems.map((item: FocusItem) => {
        const displayText = item.label || item.id;
        return (
          <Badge
            key={item.id}
            variant="secondary"
            className="group flex items-center gap-1 pr-1 text-xs"
          >
            <span className="truncate max-w-32">{displayText}</span>
            <PromptInputButton
              onClick={() => clearFocus?.(item.id)}
              className="h-4 w-4 p-0 hover:bg-background/80 opacity-60 group-hover:opacity-100 transition-opacity"
            >
              <XIcon className="h-3 w-3" />
            </PromptInputButton>
          </Badge>
        );
      }),
    [allFocusItems, clearFocus]
  );

  // Create stable hasContent for button optimization
  const hasContent = useMemo(() => Boolean(value?.trim()), [value]);

  // Optimized onChange handler - use refs to minimize re-renders
  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      currentValueRef.current = newValue;
      hasContentRef.current = Boolean(newValue.trim());
      // Only call onChange if it's a controlled component
      onChange?.(newValue);
    },
    [onChange]
  );

  // Keep focus in the input after submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      onSubmit(e);
      // Restore focus on the next tick to avoid blur from form submission state changes
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    },
    [onSubmit]
  );

  // Keep textarea enabled during streaming so users can type their next message
  // Only disable for true disabled state (not loading/streaming)
  const textareaDisabled = disabled;

  const handleTextareaKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      onKeyDown?.(event);

      if (event.defaultPrevented) {
        return;
      }

      if (
        (submitDisabled || status === "submitted" || status === "streaming") &&
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.nativeEvent.isComposing
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [submitDisabled, onKeyDown, status]
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Error Display */}
      {error && (
        <div className="px-1">
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span className="flex-1">{error}</span>
              <div className="flex items-center gap-1">
                {onRetry && (
                  <PromptInputButton
                    onClick={onRetry}
                    className="h-6 w-6 p-0 hover:bg-background/20"
                    title="Retry last message"
                  >
                    <RotateCcwIcon className="h-3 w-3" />
                  </PromptInputButton>
                )}
                <PromptInputButton
                  onClick={() => setError?.(null)}
                  className="h-6 w-6 p-0 hover:bg-background/20"
                  title="Dismiss error"
                >
                  <XIcon className="h-3 w-3" />
                </PromptInputButton>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Focus Item Chips */}
      {allFocusItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">{focusItemElements}</div>
      )}

      <PromptInput onSubmit={handleSubmit} className="w-full">
        <PromptInputTextarea
          value={value}
          onChange={handleTextareaChange}
          placeholder={placeholder}
          disabled={textareaDisabled}
          maxHeight={maxRows * 24}
          onKeyDown={handleTextareaKeyDown}
          ref={textareaRef}
        />
        <PromptInputToolbar>
          <ToolbarLeft
            models={models}
            selectedModelId={selectedModelId}
            onModelChange={onModelChange}
            onAttach={onAttach}
            disabled={disabled}
            compression={compression}
          />

          <ToolbarRight
            status={status}
            submitDisabled={submitDisabled}
            hasContent={hasContent}
            enableSuggestions={enableSuggestions}
            suggestions={suggestions}
            suggestionsCount={suggestionsCount}
            onSuggestionClick={onSuggestionClick}
            compression={compression}
            onStop={onStop}
          />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
};

// Optimized React.memo with simplified comparison for better performance
export const ChatInput = memo(ChatInputImpl, (prevProps, nextProps) => {
  // Primary props that always trigger re-render
  if (prevProps.value !== nextProps.value) return false;
  if (prevProps.disabled !== nextProps.disabled) return false;
  if (prevProps.submitDisabled !== nextProps.submitDisabled) return false;
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.error !== nextProps.error) return false;
  if (prevProps.selectedModelId !== nextProps.selectedModelId) return false;

  // Reference equality for arrays/objects (much faster than deep comparison)
  if (prevProps.models !== nextProps.models) return false;
  if (prevProps.suggestions !== nextProps.suggestions) return false;
  if (prevProps.allFocusItems !== nextProps.allFocusItems) return false;
  if (prevProps.compression !== nextProps.compression) return false;

  // Function props - assume they're stable if parent is using useCallback correctly
  // Skip function comparison to avoid performance overhead

  // All relevant props are the same
  return true;
});

ChatInput.displayName = "ChatInput";
