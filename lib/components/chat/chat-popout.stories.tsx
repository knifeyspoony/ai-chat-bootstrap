import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'
import { ChatPopout } from './chat-popout'
import type { UIMessage } from 'ai'
import { Button } from '@lib/components/ui/button'

const meta: Meta<typeof ChatPopout> = {
  title: 'Chat/ChatPopout',
  component: ChatPopout,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="h-screen w-screen bg-muted/30 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Demo Page Content</h1>
          <p className="text-muted-foreground mb-8">
            This simulates your app&apos;s content. Click the chat button to open the popout chat.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-card p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">Feature 1</h3>
              <p className="text-sm text-muted-foreground">Some content here</p>
            </div>
            <div className="bg-card p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">Feature 2</h3>
              <p className="text-sm text-muted-foreground">More content here</p>
            </div>
          </div>
        </div>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof ChatPopout>

const sampleMessages: UIMessage[] = [
  {
    id: '1',
    role: 'user',
    parts: [{ type: 'text', text: 'Hello! Can you help me with something?' }]
  },
  {
    id: '2',
    role: 'assistant',
    parts: [{ type: 'text', text: 'Of course! I\'d be happy to help you. What do you need assistance with?' }]
  },
  {
    id: '3',
    role: 'user',
    parts: [{ type: 'text', text: 'I\'m trying to understand how this chat popout component works. Can you explain the key features?' }]
  },
  {
    id: '4',
    role: 'assistant',
    parts: [{ type: 'text', text: `Great question! The ChatPopout component has several key features:

## Key Features

1. **Resizable Panel** - You can drag the left edge to resize the chat width
2. **Smooth Animations** - The chat slides in/out with CSS transitions
3. **Responsive Design** - On mobile, it shows a backdrop overlay
4. **Keyboard Support** - Press Escape to close the chat
5. **Flexible Positioning** - Can be positioned on left or right side

## Usage

The component wraps the existing ChatContainer and adds popout functionality while maintaining all the original chat features like message rendering, input handling, and customization options.` }]
  }
]

interface ChatPopoutWithStateProps {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  position?: 'left' | 'right';
  buttonLabel?: string;
  buttonIcon?: React.ReactNode;
  buttonClassName?: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  height?: string | number;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  showToggleButton?: boolean;
}

function ChatPopoutWithState(args: ChatPopoutWithStateProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<UIMessage[]>(sampleMessages)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = () => {
    if (!input.trim()) return
    
    const newMessage: UIMessage = {
      id: Date.now().toString(),
      role: 'user',
      parts: [{ type: 'text', text: input }]
    }
    
    setMessages(prev => [...prev, newMessage])
    setInput('')
    setIsLoading(true)
    
    // Simulate AI response
    setTimeout(() => {
      const response: UIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        parts: [{ type: 'text', text: `You said: "${input}". This is a simulated response from the AI assistant.` }]
      }
      setMessages(prev => [...prev, response])
      setIsLoading(false)
    }, 1500)
  }

  return (
    <ChatPopout
      {...args}
      messages={messages}
      input={input}
      onInputChange={setInput}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    />
  )
}

export const Default: Story = {
  render: (args) => <ChatPopoutWithState {...args} />,
  args: {
    title: "AI Assistant",
    subtitle: "Always here to help",
    placeholder: "Ask me anything...",
    position: "right",
    buttonLabel: "Chat"
  }
}

export const LeftPosition: Story = {
  render: (args) => <ChatPopoutWithState {...args} />,
  args: {
    title: "Support Chat",
    subtitle: "Get help instantly",
    placeholder: "How can we help?",
    position: "left",
    buttonLabel: "Support"
  }
}

export const CustomSizing: Story = {
  render: (args) => <ChatPopoutWithState {...args} />,
  args: {
    title: "Wide Chat",
    subtitle: "Spacious conversation",
    placeholder: "Type your message...",
    defaultWidth: 500,
    minWidth: 400,
    maxWidth: 800,
    height: "80vh",
    buttonLabel: "Open Chat"
  }
}

export const WithCustomButton: Story = {
  render: (args) => <ChatPopoutWithState {...args} />,
  args: {
    title: "Custom Chat",
    subtitle: "Help & Support",
    placeholder: "Ask us anything...",
    buttonIcon: <span>💬</span>,
    buttonLabel: "Get Help",
    buttonClassName: "bg-blue-600 hover:bg-blue-700"
  }
}

export const NoToggleButton: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false)
    
    return (
      <div>
        <Button onClick={() => setIsOpen(true)} className="mb-4">
          Open Chat Manually
        </Button>
        <ChatPopoutWithState 
          {...args} 
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          showToggleButton={false}
        />
      </div>
    )
  },
  args: {
    title: "Controlled Chat",
    subtitle: "Externally controlled",
    placeholder: "Start typing..."
  }
}