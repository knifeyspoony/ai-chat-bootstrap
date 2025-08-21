import type { Meta, StoryObj } from '@storybook/react'
import CanvasDemo from './page'

const meta = {
  title: 'Demos/Canvas Demo',
  component: CanvasDemo,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'desktop',
    },
    docs: {
      description: {
        component: 'Full page canvas demo showcasing AI SDK chat capabilities with interactive scenarios.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CanvasDemo>

export default meta
type Story = StoryObj<typeof meta>

export const FullPageCanvas: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Interactive canvas demo with multiple AI chat scenarios including creative writing, code review, reasoning, and data analysis.',
      },
    },
  },
}