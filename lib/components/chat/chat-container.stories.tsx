import type { Meta, StoryObj } from '@storybook/react'
import { ChatContainer } from './chat-container'
import { useState } from 'react'
import { Button } from '@lib/components/ui/button'
import { MoreHorizontalIcon, PhoneIcon, VideoIcon } from 'lucide-react'
import type { UIMessage } from 'ai'

const meta = {
  title: 'Chat/ChatContainer',
  component: ChatContainer,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'desktop',
    },
    docs: {
      disable: true,
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: { action: 'message submitted' },
    onAttach: { action: 'attach clicked' },
    onInputChange: { action: 'input changed' },
  },
} satisfies Meta<typeof ChatContainer>

export default meta
type Story = StoryObj<typeof meta>

const sampleMessages: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: [{ type: 'text', text: 'Hello! How can you help me today?' }],
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: [
      { type: 'text', text: 'Hello! I\'m here to help you with various tasks. I can:' },
      { type: 'text', text: '• Answer questions\n• Help with coding\n• Provide explanations\n• Assist with writing\n• And much more!' }
    ],
    createdAt: new Date(Date.now() - 4 * 60 * 1000),
  },
  {
    id: 'msg-3',
    role: 'user',
    content: [{ type: 'text', text: 'Can you explain how AI works?' }],
    createdAt: new Date(Date.now() - 3 * 60 * 1000),
  },
  {
    id: 'msg-4',
    role: 'assistant',
    content: [
      { 
        type: 'reasoning', 
        reasoning: 'The user is asking about AI fundamentals. I should provide a clear, accessible explanation.' 
      },
      { 
        type: 'text', 
        text: 'AI works by processing large amounts of data to identify patterns and make predictions or decisions. Here\'s a simplified breakdown:\n\n1. **Data Collection**: AI systems are trained on vast datasets\n2. **Pattern Recognition**: They learn to identify patterns in this data\n3. **Model Training**: Through machine learning, they adjust their internal parameters\n4. **Inference**: When given new input, they use learned patterns to generate responses' 
      }
    ],
    createdAt: new Date(Date.now() - 2 * 60 * 1000),
  },
]

// Wrapper component to handle state
function ChatContainerWrapper(props: any) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<UIMessage[]>(props.messages || [])
  const [isLoading, setIsLoading] = useState(props.isLoading || false)
  
  const handleSubmit = () => {
    if (!input.trim()) return
    
    const newMessage: UIMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: [{ type: 'text', text: input }],
      createdAt: new Date(),
    }
    
    setMessages(prev => [...prev, newMessage])
    setInput('')
    
    // Simulate assistant response
    setIsLoading(true)
    setTimeout(() => {
      const assistantMessage: UIMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: [{ type: 'text', text: `You said: "${input}". This is a demo response.` }],
        createdAt: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }
  
  return (
    <div style={{ 
      height: '100vh', 
      width: '100%', 
      margin: 0, 
      padding: 0,
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }}>
      <ChatContainer
        {...props}
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}

export const Default: Story = {
  render: (args) => <ChatContainerWrapper {...args} />,
  args: {
    messages: sampleMessages,
    title: 'AI Assistant',
    subtitle: 'Powered by AI SDK',
    avatar: 'https://github.com/shadcn.png',
    status: 'online',
  },
}

export const Empty: Story = {
  render: (args) => <ChatContainerWrapper {...args} />,
  args: {
    messages: [],
    placeholder: 'Start your conversation here...',
  },
}

export const Loading: Story = {
  render: (args) => <ChatContainerWrapper {...args} />,
  args: {
    messages: sampleMessages,
    isLoading: true,
  },
}

export const WithAttachment: Story = {
  render: (args) => <ChatContainerWrapper {...args} />,
  args: {
    messages: sampleMessages,
    onAttach: () => console.log('Attachment clicked'),
  },
}

export const InteractiveDemo: Story = {
  render: (args) => <ChatContainerWrapper {...args} />,
  args: {
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: [{ type: 'text', text: 'Welcome! Try typing a message below to see the interactive chat in action.' }],
        createdAt: new Date(),
      }
    ],
    title: 'Chat Demo',
    subtitle: 'Try it out!',
    avatar: 'https://github.com/shadcn.png',
    status: 'online',
    placeholder: 'Type a message to see it in action...',
  },
}

export const ComplexMessages: Story = {
  render: (args) => <ChatContainerWrapper {...args} />,
  args: {
    messages: [
      {
        id: 'complex-1',
        role: 'user',
        content: [
          { type: 'text', text: 'Can you help me with this file?' },
          { type: 'file', filename: 'data.csv', mimeType: 'text/csv', url: '#' }
        ],
        createdAt: new Date(Date.now() - 3 * 60 * 1000),
      },
      {
        id: 'complex-2',
        role: 'assistant',
        content: [
          { type: 'reasoning', reasoning: 'User has uploaded a CSV file. I should help them analyze it.' },
          { type: 'text', text: 'I can help you analyze your CSV file! Based on the filename, it looks like it contains data.' },
          { 
            type: 'tool-analyze', 
            toolName: 'csv_analyzer',
            args: { file: 'data.csv' },
            result: 'The CSV contains 1000 rows and 5 columns: id, name, age, city, score'
          },
          { type: 'text', text: 'Here\'s what I found in your file. Would you like me to help with any specific analysis?' }
        ],
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
      }
    ],
  },
}

export const WithHeader: Story = {
  render: (args) => <ChatContainerWrapper {...args} />,
  args: {
    messages: sampleMessages,
    title: 'AI Assistant',
    subtitle: 'Always ready to help',
    avatar: 'https://github.com/shadcn.png',
    status: 'online',
    badge: 'Pro',
  },
}

export const SupportChat: Story = {
  render: (args) => <ChatContainerWrapper {...args} />,
  args: {
    messages: [
      {
        id: 'support-1',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hi! How can I help you today?' }],
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
      }
    ],
    title: 'Support Team',
    subtitle: 'We typically reply in a few minutes',
    avatar: 'https://github.com/shadcn.png',
    status: 'online',
    headerActions: (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon">
          <PhoneIcon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <VideoIcon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <MoreHorizontalIcon className="h-4 w-4" />
        </Button>
      </div>
    ),
    placeholder: 'Describe your issue...',
  },
}

export const ScrollingDemo: Story = {
  render: (args) => <ChatContainerWrapper {...args} />,
  args: {
    messages: Array.from({ length: 20 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: [{ 
        type: 'text', 
        text: i % 2 === 0 
          ? `This is user message ${i + 1}. Let me ask you about something important.`
          : `This is assistant response ${i + 1}. Here's a helpful answer to your question with some additional context and information.`
      }],
      createdAt: new Date(Date.now() - (20 - i) * 60 * 1000),
    })) as UIMessage[],
    title: 'Scrolling Demo',
    subtitle: 'Many messages to test scrolling',
    avatar: 'https://github.com/shadcn.png',
    status: 'online',
    placeholder: 'Type a message...',
  },
}

export const LongMessagesTest: Story = {
  render: (args) => <ChatContainerWrapper {...args} />,
  args: {
    messages: [
      {
        id: 'long-1',
        role: 'user',
        content: [{ 
          type: 'text', 
          text: 'This is a very very very long message that should wrap properly without causing horizontal scrolling in the chat interface. It contains a lot of text to test the wrapping behavior and make sure everything displays correctly within the chat bubble without breaking the layout or causing any horizontal overflow issues that would make the chat unusable.'
        }],
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
      },
      {
        id: 'long-2',
        role: 'assistant',
        content: [{ 
          type: 'text', 
          text: `Here's a comprehensive response with **markdown formatting** and various elements:

## Long Response Test

This is testing how the chat handles very long responses with markdown content. The text should wrap properly without causing horizontal scrolling.

### Features Being Tested:
- **Text wrapping**: Long paragraphs should break naturally
- **Code blocks**: Inline code like \`this-very-long-variable-name-that-might-cause-overflow\` should handle properly
- **Lists**: Items should wrap within the available space
- **Links**: [This is a very long link text that should wrap properly](https://example.com)

\`\`\`javascript
// Code blocks should have their own horizontal scroll
function veryLongFunctionNameThatMightCauseHorizontalScrolling(parameterWithVeryLongNameThatGoesOnAndOn) {
  return parameterWithVeryLongNameThatGoesOnAndOn.someVeryLongMethodNameThatContinuesForever();
}
\`\`\`

| Column 1 | Column 2 | Very Long Column Header That Tests Table Overflow |
|----------|----------|--------------------------------------------------|
| Short | Data | This is a very long cell that should test table wrapping |
| More | Content | Another cell with lots and lots and lots of text |

> This is a blockquote with very long text that should wrap properly within the available space without causing any layout issues or horizontal scrolling problems in the chat interface.

The message continues with more text to ensure everything wraps correctly and maintains proper formatting.`
        }],
        createdAt: new Date(Date.now() - 3 * 60 * 1000),
      },
      {
        id: 'long-3',
        role: 'user',
        content: [{ 
          type: 'text', 
          text: 'URLsLikeThisOneWithoutSpacesCouldPotentiallyBreaklayout: https://example.com/very/long/path/that/goes/on/and/on/without/any/breaks/or/spaces/which/might/cause/horizontal/overflow/issues/in/the/chat/interface'
        }],
        createdAt: new Date(Date.now() - 1 * 60 * 1000),
      }
    ] as UIMessage[],
    title: 'Text Wrapping Test',
    subtitle: 'Testing long content handling',
    avatar: 'https://github.com/shadcn.png',
    status: 'online',
    placeholder: 'Type a long message to test...',
  },
}