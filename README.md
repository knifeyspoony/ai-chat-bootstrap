# AI SDK Chat

A React component library for building AI chat interfaces using Vercel AI SDK with enhanced UX features.

## Features

- **AI SDK Elements Integration**: Pre-built UI components from ai-sdk.dev/elements/
- **Automatic Context Sharing**: Hooks for seamless chat context management  
- **Frontend Tools**: Interactive UX components for enhanced user experience
- **Focus Items**: UI element highlighting for contextual AI assistance
- **AI Suggestions**: Intelligent suggestions and recommendations
- **Chat Commands**: Built-in command system for chat interactions

## Development

```bash
pnpm install
pnpm run dev          # Next.js dev server
pnpm run build:lib    # Build for npm
pnpm run lint         # Type checking
```

## Installation (not yet available)

```bash
pnpm add ai-sdk-chat
```

Import the required CSS:

```tsx
import 'ai-sdk-chat/lib/styles.css'
```

## Quick Start

```tsx
import { ChatContainer, ChatInput } from 'ai-sdk-chat'
import { useChat } from 'ai/react'

export default function App() {
  const { messages, input, handleInputChange, handleSubmit } = useChat()

  return (
    <ChatContainer>
      {messages.map(message => (
        <div key={message.id}>
          {/* Messages render automatically based on UIMessage parts */}
        </div>
      ))}
      <ChatInput 
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
      />
    </ChatContainer>
  )
}
```

## Core Components

### Chat Components
- `ChatContainer` - Main chat wrapper
- `ChatInput` - Input with command support  
- `ChatMessage` - Message renderer for UIMessage format

### Message Types
- `TextMessage` - Markdown text rendering
- `ReasoningMessage` - AI reasoning display
- `FileMessage` - File attachments
- `SourceUrlMessage` - URL references
- `ToolMessage` - Tool invocation results

## Hooks

### Context Management
```tsx
import { useAIContext } from 'ai-sdk-chat'

// Share app state automatically with chat
useAIContext('counter', counter)
useAIContext('userProfile', { 
  name: user.name, 
  role: user.role 
})
```

### Frontend Tools
```tsx
import { useAIFrontendTool } from 'ai-sdk-chat'

// Register tools that execute in the browser
useAIFrontendTool({
  name: 'increment_counter',
  description: 'Increment the demo counter',
  parameters: z.object({
    amount: z.number().default(1).describe('Amount to increment by')
  }),
  execute: async ({ amount }) => {
    setCounter(prev => prev + amount)
    return { newValue: counter + amount }
  }
})
```

### Focus Items
```tsx
import { useAIFocus } from 'ai-sdk-chat'

// Track selected UI items for contextual AI assistance
const { setFocus, clearFocus, focusedIds } = useAIFocus()
const [selectedNote, setSelectedNote] = useState(null)

// When user selects an item, add it to focus
useEffect(() => {
  if (selectedNote) {
    setFocus(selectedNote.id, {
      id: selectedNote.id,
      type: 'note', 
      title: selectedNote.title,
      content: selectedNote.content
    })
  } else {
    clearFocus('note-123')
  }
}, [selectedNote, setFocus, clearFocus])

// Now when user asks "What's the main point here?", 
// the LLM gets the selected note's content as context with an indication
// that the item is selected and so it may be highly relevant
```

### Chat Commands
```tsx
import { useAIChatCommand } from 'ai-sdk-chat'

// Register slash commands for quick actions
useAIChatCommand({
  name: 'reset',
  description: 'Reset all demo widgets to initial state',
  parameters: z.object({}),
  execute: async () => {
    setCounter(0)
    setCalculation(null)
    clearAllFocus()
  }
})

// User can now type "/reset" in chat to execute
```

## Message Format

Uses AI SDK UIMessage format with support for multiple content types:

```typescript
interface UIMessage {
  id: string
  role: 'system' | 'user' | 'assistant'
  parts: Array<{
    type: 'text' | 'reasoning' | 'file' | 'source-url' | 'tool-*' | 'data-*'
    // ... type-specific properties
  }>
}
```

## Tech Stack

- React 19.1.0
- Vercel AI SDK v5.x
- shadcn/ui + Tailwind CSS
- TypeScript
- Next.js 15.5.0

## License

MIT