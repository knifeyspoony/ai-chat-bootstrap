import React, { useEffect, useMemo, useState } from "react";
import type { UIMessage } from "ai";
import { CommandDropdown } from "../../components/ui/chat-command";
import { CommandParameterInfo } from "../../components/ui/command-parameter-info";
import { useChatStore } from "../../stores/chat";
import {
  useAIChatCommandsStore,
  type ChatCommand,
} from "../../stores/commands";
import {
  getCurrentParameterIndex,
  hasAllRequiredParams,
  hasRequiredParameters,
  parseArgsToParams,
} from "../../utils/command-utils";
import { ChatInput, type ChatInputProps } from "./chat-input";
import { useChatThreadsStore } from "../../stores/chat-threads";

// Stable empty array to avoid creating a new reference on each selector call
const EMPTY_UI_MESSAGES: UIMessage[] = [];

export interface ChatInputWithCommandsProps extends ChatInputProps {
  // Commands props
  enableCommands?: boolean;
  onCommandExecute?: (commandName: string, args?: string) => void;
  onAICommandExecute?: (
    message: string,
    toolName: string,
    systemPrompt?: string
  ) => void;
}

const ChatInputWithCommandsImpl = ({
  value,
  onChange,
  onSubmit,
  enableCommands = false,
  onCommandExecute,
  onAICommandExecute,
  ...props
}: ChatInputWithCommandsProps) => {
  const setError = useChatStore((state) => state.setError);
  // Local draft state for uncontrolled usage
  const [draft, setDraft] = useState("");
  const isControlled = typeof value === "string" && typeof onChange === "function";
  const currentValue = isControlled ? (value as string) : draft;
  const updateValue = (next: string) => {
    if (isControlled) {
      (onChange as (v: string) => void)(next);
    } else {
      setDraft(next);
    }
  };
  const clearInput = () => updateValue("");

  // Command detection state
  const [showCommands, setShowCommands] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [showParameterInfo, setShowParameterInfo] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<ChatCommand | null>(
    null
  );
  const [currentParameterIndex, setCurrentParameterIndex] = useState(0);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [parameterValidationError, setParameterValidationError] = useState<
    string | null
  >(null);
  const getMatchingCommands = useAIChatCommandsStore(
    (s) => s.getMatchingCommands
  );
  const executeCommand = useAIChatCommandsStore((s) => s.executeCommand);
  const getCommand = useAIChatCommandsStore((s) => s.getCommand);

  // --- Input history state ---
  // Index into user message history (0..n-1). null when not navigating history.
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  // Preserve the user's current draft before history navigation begins.
  const [savedDraft, setSavedDraft] = useState<string>("");

  // Source user messages from the active thread in the zustand store to avoid stale props.
  const threadMessages = useChatThreadsStore((s) => {
    const id = s.activeThreadId;
    const msgs = id
      ? (s.threads.get(id)?.messages as UIMessage[] | undefined)
      : undefined;
    return msgs ?? EMPTY_UI_MESSAGES;
  });

  // Build user text history (chronological). Empty when no messages.
  const userHistory = useMemo(() => {
    const list = (threadMessages ?? [])
      .filter((m) => m.role === "user")
      .map((m) => {
        const parts = (m as any).parts as Array<any> | undefined;
        if (Array.isArray(parts) && parts.length > 0) {
          const text = parts
            .map((p) => (p && p.type === "text" ? String(p.text ?? "") : ""))
            .filter(Boolean)
            .join(" ")
            .trim();
          return text;
        }
        const content = (m as any).content as any;
        if (typeof content === "string") return content;
        if (Array.isArray(content))
          return content.map((c) => String(c?.text ?? "")).join(" ").trim();
        return "";
      })
      .filter((t) => t.length > 0);
    return list;
  }, [threadMessages]);

  // Detect command input and parameter completion
  useEffect(() => {
    if (!enableCommands) return;

    const isCommandInput = currentValue.startsWith("/");

    if (isCommandInput) {
      const cmdText = currentValue.slice(1);
      const [cmdName, ...args] = cmdText.split(" ");

      // If we have a space after command name, check if it's a valid command needing args
      if (args.length > 0 || cmdText.endsWith(" ")) {
        const command = getCommand(cmdName);
        if (command && hasRequiredParameters(command.parameters)) {
          // Show parameter info instead of helper text
          setSelectedCommand(command);
          setShowParameterInfo(true);
          setShowCommands(false);

          // Calculate current parameter index based on cursor position
          const textarea = document.querySelector(
            'textarea[data-testid="chat-input"], textarea'
          ) as HTMLTextAreaElement;
          const cursorPos = textarea?.selectionStart || currentValue.length;
          const paramIndex = getCurrentParameterIndex(
            currentValue,
            cursorPos,
            command.parameters
          );
          setCurrentParameterIndex(paramIndex);
        } else {
          setShowParameterInfo(false);
          setSelectedCommand(null);
          setShowCommands(false);
        }
      } else {
        // Still typing command name, show command list
        setCommandQuery(cmdName);
        setShowCommands(true);
        setShowParameterInfo(false);
        setSelectedCommand(null);
        setSelectedCommandIndex(0); // Reset selection when showing commands
      }
    } else {
      setShowCommands(false);
      setShowParameterInfo(false);
      setCommandQuery("");
      setSelectedCommand(null);
    }
  }, [currentValue, enableCommands, getCommand]);

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only intercept keys when we're actively typing a command (starts with '/')
    if (showCommands && matchingCommands.length > 0 && currentValue.startsWith("/")) {
      if (e.key === "Escape") {
        setShowCommands(false);
        setSelectedCommandIndex(0);
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Handle arrow keys for command navigation
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedCommandIndex(
          (prev) => (prev + 1) % matchingCommands.length // Wrap around to beginning
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedCommandIndex(
          (prev) =>
            (prev + matchingCommands.length - 1) % matchingCommands.length // Wrap around to end
        );
        return;
      }

      // Handle Enter to select highlighted command
      if (e.key === "Enter") {
        e.preventDefault();
        if (matchingCommands[selectedCommandIndex]) {
          handleCommandSelect(matchingCommands[selectedCommandIndex]);
        }
        return;
      }
    }

    if (showParameterInfo && e.key === "Escape") {
      setShowParameterInfo(false);
      setSelectedCommand(null);
      clearInput();
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Input history navigation (only when not in command UI)
    // - ArrowUp: cycle to previous user messages, starting from most recent
    // - ArrowDown: cycle forward and eventually restore the saved draft
    // Behavior only triggers when caret is at start (Up) or end (Down)
    // and when not typing a "/" command.
    if (!currentValue.startsWith("/")) {
      const el = e.currentTarget as HTMLTextAreaElement;
      const caretStart = el?.selectionStart ?? 0;
      const caretEnd = el?.selectionEnd ?? 0;
      const atStart = caretStart === 0 && caretEnd === 0;
      const atEnd = caretStart === (currentValue?.length ?? 0) && caretEnd === caretStart;

      if (e.key === "ArrowUp" && atStart && userHistory.length > 0) {
        e.preventDefault();
        // On first navigation, save the current draft
        if (historyIndex === null) {
          setSavedDraft(currentValue);
          const idx = userHistory.length - 1; // most recent
          setHistoryIndex(idx);
          const next = userHistory[idx] ?? "";
          updateValue(next);
        } else {
          const nextIndex = Math.max(0, historyIndex - 1);
          setHistoryIndex(nextIndex);
          const next = userHistory[nextIndex] ?? "";
          updateValue(next);
        }
        // Place caret at end after value updates
        setTimeout(() => {
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }, 0);
        return;
      }

      if (e.key === "ArrowDown" && atEnd) {
        if (historyIndex !== null) {
          e.preventDefault();
          const nextIndex = historyIndex + 1;
          if (nextIndex >= userHistory.length) {
            // Restore draft and exit history mode
            setHistoryIndex(null);
            updateValue(savedDraft);
            // caret to end
            setTimeout(() => {
              const len = el.value.length;
              el.setSelectionRange(len, len);
            }, 0);
          } else {
            setHistoryIndex(nextIndex);
            const next = userHistory[nextIndex] ?? "";
            updateValue(next);
            setTimeout(() => {
              const len = el.value.length;
              el.setSelectionRange(len, len);
            }, 0);
          }
          return;
        }
      }
    }
  };

  // Get matching commands
  const matchingCommands =
    enableCommands && showCommands ? getMatchingCommands(commandQuery) : [];

  // Reset selected index if it's out of bounds when commands change
  useEffect(() => {
    if (
      selectedCommandIndex >= matchingCommands.length &&
      matchingCommands.length > 0
    ) {
      setSelectedCommandIndex(0);
    }
  }, [matchingCommands.length, selectedCommandIndex]);

  // Handle command selection
  const handleCommandSelect = async (command: ChatCommand | string) => {
    const cmd = typeof command === "string" ? getCommand(command) : command;
    if (!cmd) return;

    try {
      if (!hasRequiredParameters(cmd.parameters)) {
        // Execute immediately - no args needed
        if (cmd.type === "ui") {
          await executeCommand(cmd.name, {});
          onCommandExecute?.(cmd.name, undefined);
        } else if (cmd.type === "ai") {
          // Send AI command message with no parameters
          const message = `Execute ${cmd.name} command`;
          onAICommandExecute?.(message, cmd.toolName, cmd.systemPrompt);
        }
        clearInput();
        setShowCommands(false);

        // Return focus to the chat input
        setTimeout(() => {
          const textarea = document.querySelector(
            'textarea[data-testid="chat-input"], textarea'
          );
          if (textarea) {
            (textarea as HTMLTextAreaElement).focus();
          }
        }, 10);
      } else {
        // Command needs parameters - set input with command name and space
        updateValue(`/${cmd.name} `);
        setShowCommands(false);
        setSelectedCommand(cmd);
        setShowParameterInfo(true);
        setCurrentParameterIndex(0);
        setParameterValidationError(null); // Clear any previous errors
      }
    } catch {
      setError("Command execution failed");
    }
  };

  // Handle form submission - prevent if showing commands
  const handleSubmit = async (e: React.FormEvent) => {
    // Only prevent form submission if we're actively typing a command
    if (showCommands && matchingCommands.length > 0 && currentValue.startsWith("/")) {
      e.preventDefault();
      handleCommandSelect(
        matchingCommands[selectedCommandIndex] || matchingCommands[0]
      );
      return;
    }

    // Handle command execution with parameters
    if (currentValue.startsWith("/")) {
      e.preventDefault();
      const cmdText = currentValue.slice(1);
      const [cmdName, ...args] = cmdText.split(" ");
      const command = getCommand(cmdName);

      if (command) {
        const argsString = args.join(" ");

        // Check if all required parameters are provided
        if (!hasAllRequiredParams(argsString, command.parameters)) {
          setParameterValidationError(
            "Please fill in all required parameters before executing the command"
          );
          return;
        }

        // Clear any previous validation error
        setParameterValidationError(null);

        try {
          const params = parseArgsToParams(argsString, command.parameters);

          if (command.type === "ui") {
            await executeCommand(cmdName, params);
            onCommandExecute?.(cmdName, argsString || undefined);
          } else if (command.type === "ai") {
            // Build AI command message with parameters
            const message = argsString ? `${cmdName} ${argsString}` : cmdName;
            onAICommandExecute?.(
              message,
              command.toolName,
              command.systemPrompt
            );
          }

          clearInput();
          setShowParameterInfo(false);
          setSelectedCommand(null);
          setParameterValidationError(null);

          // Return focus to the chat input
          setTimeout(() => {
            const textarea = document.querySelector(
              'textarea[data-testid="chat-input"], textarea'
            );
            if (textarea) {
              (textarea as HTMLTextAreaElement).focus();
            }
          }, 10);
        } catch {
          setError("Command execution failed");
        }
        return;
      }
    }

    onSubmit?.(e);
    clearInput();
  };

  // Enhanced ChatInput with command dropdown
  if (!enableCommands) {
    return (
      <ChatInput
        value={currentValue}
        onChange={updateValue}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }

  return (
    <div className="relative">
      <ChatInput
        value={currentValue}
        onChange={updateValue}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        {...props}
      />

      {/* Command dropdown for command selection */}
      {showCommands && matchingCommands.length > 0 && (
        <CommandDropdown
          commands={matchingCommands}
          selectedIndex={selectedCommandIndex}
          onSelect={(command) => handleCommandSelect(command)}
          onSelectedIndexChange={setSelectedCommandIndex}
        />
      )}

      {/* Parameter info display */}
      {showParameterInfo && selectedCommand && (
        <div className="absolute bottom-full mb-2 left-0 right-0 z-50 flex justify-start">
          <CommandParameterInfo
            command={selectedCommand}
            currentParameterIndex={currentParameterIndex}
            validationError={parameterValidationError || undefined}
          />
        </div>
      )}
    </div>
  );
};

export const ChatInputWithCommands = React.memo(ChatInputWithCommandsImpl);

ChatInputWithCommands.displayName = "ChatInputWithCommands";
