import React, { useEffect, useState } from "react";
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

export const ChatInputWithCommands = ({
  value,
  onChange,
  onSubmit,
  enableCommands = false,
  onCommandExecute,
  onAICommandExecute,
  ...props
}: ChatInputWithCommandsProps) => {
  const setError = useChatStore((state) => state.setError);

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
  const { getMatchingCommands, executeCommand, getCommand } =
    useAIChatCommandsStore();

  // Detect command input and parameter completion
  useEffect(() => {
    if (!enableCommands) return;

    const isCommandInput = value.startsWith("/");

    if (isCommandInput) {
      const cmdText = value.slice(1);
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
          const cursorPos = textarea?.selectionStart || value.length;
          const paramIndex = getCurrentParameterIndex(
            value,
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
  }, [value, enableCommands, getCommand]);

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only intercept keys when we're actively typing a command (starts with '/')
    if (showCommands && matchingCommands.length > 0 && value.startsWith("/")) {
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
      onChange("");
      e.preventDefault();
      e.stopPropagation();
      return;
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
        onChange("");
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
        onChange(`/${cmd.name} `);
        setShowCommands(false);
        setSelectedCommand(cmd);
        setShowParameterInfo(true);
        setCurrentParameterIndex(0);
        setParameterValidationError(null); // Clear any previous errors
      }
    } catch (error) {
      console.error("Failed to execute command:", error);
      setError(
        error instanceof Error ? error.message : "Command execution failed"
      );
    }
  };

  // Handle form submission - prevent if showing commands
  const handleSubmit = async (e: React.FormEvent) => {
    // Only prevent form submission if we're actively typing a command
    if (showCommands && matchingCommands.length > 0 && value.startsWith("/")) {
      e.preventDefault();
      handleCommandSelect(
        matchingCommands[selectedCommandIndex] || matchingCommands[0]
      );
      return;
    }

    // Handle command execution with parameters
    if (value.startsWith("/")) {
      e.preventDefault();
      const cmdText = value.slice(1);
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

          onChange("");
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
        } catch (error) {
          console.error("Failed to execute command:", error);
          setError(
            error instanceof Error ? error.message : "Command execution failed"
          );
        }
        return;
      }
    }

    onSubmit(e);
  };

  // Enhanced ChatInput with command dropdown
  if (!enableCommands) {
    return (
      <ChatInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        {...props}
      />
    );
  }

  return (
    <div className="relative">
      <ChatInput
        value={value}
        onChange={onChange}
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

ChatInputWithCommands.displayName = "ChatInputWithCommands";
