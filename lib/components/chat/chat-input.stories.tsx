import type { Meta, StoryObj } from '@storybook/react'
import { ChatInput } from './chat-input'
import { useState } from 'react'

const meta = {
  title: 'Chat/ChatInput',
  component: ChatInput,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: { action: 'submitted' },
    onAttach: { action: 'attach clicked' },
    onChange: { action: 'changed' },
  },
} satisfies Meta<typeof ChatInput>

export default meta
type Story = StoryObj<typeof meta>

// Wrapper component to handle state
function ChatInputWrapper(props: any) {
  const [value, setValue] = useState(props.value || '')
  
  return (
    <ChatInput
      {...props}
      value={value}
      onChange={(newValue) => {
        setValue(newValue)
        props.onChange?.(newValue)
      }}
    />
  )
}

export const Default: Story = {
  render: (args) => <ChatInputWrapper {...args} />,
  args: {
    placeholder: 'Type your message...',
  },
}

export const WithAttach: Story = {
  render: (args) => <ChatInputWrapper {...args} />,
  args: {
    placeholder: 'Type your message...',
    onAttach: () => console.log('Attach clicked'),
  },
}

export const Disabled: Story = {
  render: (args) => <ChatInputWrapper {...args} />,
  args: {
    placeholder: 'Chat is disabled...',
    disabled: true,
    value: 'This input is disabled',
  },
}

export const WithInitialValue: Story = {
  render: (args) => <ChatInputWrapper {...args} />,
  args: {
    value: 'This is some initial text in the input',
    placeholder: 'Type your message...',
  },
}

export const CustomPlaceholder: Story = {
  render: (args) => <ChatInputWrapper {...args} />,
  args: {
    placeholder: 'Ask me anything about AI and machine learning...',
  },
}

export const LimitedRows: Story = {
  render: (args) => <ChatInputWrapper {...args} />,
  args: {
    placeholder: 'This input has a max of 2 rows...',
    maxRows: 2,
  },
}