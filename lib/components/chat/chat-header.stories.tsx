import type { Meta, StoryObj } from '@storybook/react'
import { ChatHeader } from './chat-header'
import { Button } from '@lib/components/ui/button'
import { MoreHorizontalIcon, PhoneIcon, VideoIcon } from 'lucide-react'

const meta = {
  title: 'Chat/ChatHeader',
  component: ChatHeader,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['online', 'offline', 'away', 'busy'],
    },
  },
} satisfies Meta<typeof ChatHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'AI Assistant',
    subtitle: 'Always ready to help',
    avatar: 'https://github.com/shadcn.png',
    status: 'online',
  },
}

export const WithBadge: Story = {
  args: {
    title: 'Claude',
    subtitle: 'AI Assistant by Anthropic',
    avatar: 'https://github.com/shadcn.png',
    status: 'online',
    badge: 'Pro',
  },
}

export const WithActions: Story = {
  args: {
    title: 'Support Chat',
    subtitle: 'We typically reply in a few minutes',
    avatar: 'https://github.com/shadcn.png',
    status: 'online',
    actions: (
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
  },
}

export const Minimal: Story = {
  args: {
    title: 'Chat',
  },
}

export const StatusVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <ChatHeader 
        title="Online Assistant" 
        subtitle="Ready to help" 
        status="online"
        avatar="https://github.com/shadcn.png"
      />
      <ChatHeader 
        title="Away Assistant" 
        subtitle="Will be back soon" 
        status="away"
        avatar="https://github.com/shadcn.png"
      />
      <ChatHeader 
        title="Busy Assistant" 
        subtitle="In a meeting" 
        status="busy"
        avatar="https://github.com/shadcn.png"
      />
      <ChatHeader 
        title="Offline Assistant" 
        subtitle="Currently unavailable" 
        status="offline"
        avatar="https://github.com/shadcn.png"
      />
    </div>
  ),
}