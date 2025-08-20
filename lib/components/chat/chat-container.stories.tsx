import type { Meta, StoryObj } from '@storybook/react'
import { ChatContainer } from './chat-container'
import { useState } from 'react'
import type { UIMessage } from 'ai'

const meta = {
  title: 'Chat/ChatContainer',
  component: ChatContainer,
  parameters: {
    layout: 'fullscreen',
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
    <div style={{ height: '600px' }}>
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