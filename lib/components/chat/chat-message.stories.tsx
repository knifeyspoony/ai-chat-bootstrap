import type { Meta, StoryObj } from '@storybook/react'
import { ChatMessage } from './chat-message'
import type { UIMessage } from 'ai'

const meta = {
  title: 'Chat/ChatMessage',
  component: ChatMessage,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    message: {
      description: 'The UIMessage object from AI SDK',
    },
    avatar: {
      control: 'text',
      description: 'Avatar URL for the message sender',
    },
    name: {
      control: 'text',
      description: 'Display name for the message sender',
    },
  },
} satisfies Meta<typeof ChatMessage>

export default meta
type Story = StoryObj<typeof meta>

const createMessage = (role: 'user' | 'assistant' | 'system', content: any[]): UIMessage => ({
  id: 'msg-1',
  role,
  content,
  createdAt: new Date(),
})

export const UserMessage: Story = {
  args: {
    message: createMessage('user', [{ type: 'text', text: 'Hello! How can you help me today?' }]),
    name: 'John Doe',
    avatar: 'https://github.com/shadcn.png',
  },
}

export const AssistantMessage: Story = {
  args: {
    message: createMessage('assistant', [{ type: 'text', text: 'Hello! I\'m here to help you with any questions you have. What would you like to know?' }]),
    name: 'Assistant',
  },
}

export const MarkdownMessage: Story = {
  args: {
    message: createMessage('assistant', [{ 
      type: 'text', 
      text: `Here's some **formatted text** with markdown:

## Code Example
\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

const message = greet("World");
console.log(message);
\`\`\`

### Features
- **Bold text** and *italic text*
- \`inline code\` formatting
- [Links](https://example.com)

> This is a blockquote with useful information.

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
| Data 3   | Data 4   |`
    }]),
    name: 'Assistant',
  },
}

export const UserMarkdownMessage: Story = {
  args: {
    message: createMessage('user', [{ 
      type: 'text', 
      text: `Can you help me with this **React component**?

\`\`\`tsx
const MyComponent = () => {
  return <div>Hello World</div>;
};
\`\`\`

I'm having trouble with:
1. State management
2. Props handling
3. Event listeners`
    }]),
    name: 'John Doe',
    avatar: 'https://github.com/shadcn.png',
  },
}

export const SystemMessage: Story = {
  args: {
    message: createMessage('system', [{ type: 'text', text: 'Chat session started' }]),
  },
}

export const ReasoningMessage: Story = {
  args: {
    message: createMessage('assistant', [
      { type: 'reasoning', reasoning: 'The user is asking about weather, so I should provide helpful information about current conditions and forecasts.' },
      { type: 'text', text: 'I\'d be happy to help you with weather information! However, I don\'t have access to real-time weather data.' }
    ]),
  },
}

export const ToolMessage: Story = {
  args: {
    message: createMessage('assistant', [
      { type: 'text', text: 'Let me search for that information.' },
      { 
        type: 'tool-search', 
        toolName: 'search',
        args: { query: 'latest AI developments' },
        result: 'Found 5 relevant articles about recent AI developments including GPT-4, Claude, and new research papers.'
      }
    ]),
  },
}

export const FileMessage: Story = {
  args: {
    message: createMessage('user', [
      { type: 'text', text: 'Here\'s the document you requested:' },
      { 
        type: 'file', 
        filename: 'report.pdf',
        mimeType: 'application/pdf',
        url: '#'
      }
    ]),
  },
}

export const SourceMessage: Story = {
  args: {
    message: createMessage('assistant', [
      { type: 'text', text: 'Based on this source:' },
      { 
        type: 'source-url', 
        title: 'AI SDK Documentation',
        url: 'https://sdk.vercel.ai/docs'
      }
    ]),
  },
}

export const MultipartMessage: Story = {
  args: {
    message: createMessage('assistant', [
      { type: 'reasoning', reasoning: 'The user wants to understand multiple concepts, so I should provide a comprehensive response.' },
      { type: 'text', text: 'Here\'s what I found:' },
      { 
        type: 'source-url', 
        title: 'Documentation',
        url: 'https://example.com'
      },
      { type: 'text', text: 'This covers the basics of what you\'re looking for.' }
    ]),
  },
}

export const LongMessage: Story = {
  args: {
    message: createMessage('assistant', [
      { 
        type: 'text', 
        text: `This is a longer message that demonstrates how the chat message component handles extended content. It includes multiple paragraphs and shows how text wrapping works within the message bubble.

This second paragraph shows that line breaks are preserved and the message maintains good readability even with longer content.

And here's a third paragraph to really show how it handles extended text content with proper spacing and formatting.`
      }
    ]),
  },
}