// Main chat components
export { ChatInput } from "@lib/components/chat/chat-input"
export { ChatContainer } from "@lib/components/chat/chat-container"
export { ChatHeader } from "@lib/components/chat/chat-header"
export { ChatMessages } from "@lib/components/chat/chat-messages"
export { ChatPopout } from "@lib/components/chat/chat-popout"

// AI Elements components (re-exported for convenience)
export * from "@lib/components/ai-elements/conversation"
export * from "@lib/components/ai-elements/message"
export * from "@lib/components/ai-elements/prompt-input"
export * from "@lib/components/ai-elements/response"
export * from "@lib/components/ai-elements/reasoning"
export * from "@lib/components/ai-elements/source"
export * from "@lib/components/ai-elements/tool"
export * from "@lib/components/ai-elements/code-block"
export * from "@lib/components/ai-elements/loader"
export * from "@lib/components/ai-elements/suggestion"

// Legacy components removed - use AI Elements Message component directly