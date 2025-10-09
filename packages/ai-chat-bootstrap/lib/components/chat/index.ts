// Main chat components
export {
  ChatContainer,
  MockChatContainer,
} from "../../components/chat/chat-container";
export type { ChatContainerProps } from "../../components/chat/chat-container";
export { ChatHeader } from "../../components/chat/chat-header";
export { ChatInput } from "../../components/chat/chat-input";
export { ChatInputWithCommands } from "../../components/chat/chat-input-with-commands";
export { ChatMessages } from "../../components/chat/chat-messages";
export { ChatPopout } from "../../components/chat/chat-popout";
export type { ChatPopoutProps } from "../../components/chat/chat-popout";
export { ChatThreadsButton } from "../../components/chat/chat-threads-button";
export { AssistantMessage } from "./assistant-message";
export { ChatChainOfThought } from "./chat-chain-of-thought";
export { CompressionArtifactsSheet } from "./compression-artifacts-sheet";
export { CompressionBanner } from "./compression-banner";
export { CompressionUsageIndicator } from "./compression-usage-indicator";

// Message part components
export { ChatMessagePart } from "./chat-message-part";
export { ChatMessagePartCompact } from "./chat-message-part-compact";

// Compact elements
export * from "./elements";

// AI Elements components (re-exported for convenience)
export * from "../../components/ai-elements/actions";
export * from "../../components/ai-elements/chain-of-thought";
export * from "../../components/ai-elements/code-block";
export * from "../../components/ai-elements/conversation";
export * from "../../components/ai-elements/loader";
export * from "../../components/ai-elements/message";
export * from "../../components/ai-elements/prompt-input";
export * from "../../components/ai-elements/reasoning";
export * from "../../components/ai-elements/response";
export * from "../../components/ai-elements/sources";
export * from "../../components/ai-elements/suggestion";
export * from "../../components/ai-elements/tool";
