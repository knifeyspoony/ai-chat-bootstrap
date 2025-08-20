import type { Meta, StoryObj } from '@storybook/react'
import { ChatMessages } from './chat-messages'
import type { UIMessage } from 'ai'

const meta = {
  title: 'Chat/ChatMessages',
  component: ChatMessages,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ 
        height: '100vh', 
        width: '100%', 
        display: 'flex',
        flexDirection: 'column',
        padding: '16px', 
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        minWidth: 0
      }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChatMessages>

export default meta
type Story = StoryObj<typeof meta>

const createMessage = (role: 'user' | 'assistant' | 'system', content: any[]): UIMessage => ({
  id: `msg-${Math.random()}`,
  role,
  content,
  createdAt: new Date(),
})

const sampleMessages: UIMessage[] = [
  createMessage('user', [{ type: 'text', text: 'Hello! How can you help me today?' }]),
  createMessage('assistant', [{ type: 'text', text: 'Hello! I\'m here to help you with any questions you have. What would you like to know?' }]),
  createMessage('user', [{ type: 'text', text: 'Can you help me understand React hooks?' }]),
  createMessage('assistant', [{ 
    type: 'text', 
    text: `Sure! React hooks are functions that let you use state and other React features in functional components. Here are the most common ones:

## useState
\`\`\`javascript
const [count, setCount] = useState(0);
\`\`\`

## useEffect
\`\`\`javascript
useEffect(() => {
  // Side effect code here
}, [dependencies]);
\`\`\`

Would you like me to explain any specific hook in more detail?`
  }]),
]

export const Default: Story = {
  args: {
    messages: sampleMessages,
    isLoading: false,
  },
}

export const Empty: Story = {
  args: {
    messages: [],
    isLoading: false,
  },
}

export const Loading: Story = {
  args: {
    messages: sampleMessages,
    isLoading: true,
  },
}

export const CustomEmptyState: Story = {
  args: {
    messages: [],
    isLoading: false,
    emptyState: (
      <div className="flex items-center justify-center h-full text-center p-8">
        <div className="text-muted-foreground">
          <div className="text-4xl mb-4">🤖</div>
          <p className="text-lg mb-2">Welcome to AI Chat!</p>
          <p className="text-sm">Ask me anything to get started</p>
        </div>
      </div>
    ),
  },
}

export const LongConversation: Story = {
  args: {
    messages: [
      ...sampleMessages,
      createMessage('user', [{ type: 'text', text: 'Tell me more about useEffect' }]),
      createMessage('assistant', [{ type: 'text', text: 'useEffect is a hook that lets you perform side effects in functional components. It serves the same purpose as componentDidMount, componentDidUpdate, and componentWillUnmount combined in React class components.' }]),
      createMessage('user', [{ type: 'text', text: 'What about dependency arrays?' }]),
      createMessage('assistant', [{ type: 'text', text: 'Great question! The dependency array is the second argument to useEffect. It controls when the effect runs...' }]),
    ],
    isLoading: false,
  },
}

export const OverflowTest: Story = {
  args: {
    messages: [
      createMessage('user', [{ 
        type: 'text', 
        text: 'This is a very very very long message that should test horizontal overflow behavior. It contains a lot of text without spaces like supercalifragilisticexpialidocious and should wrap properly without causing horizontal scrolling in the chat interface. URLs like https://example.com/very/long/path/that/goes/on/and/on/without/any/breaks/should/also/wrap/properly.' 
      }]),
      createMessage('assistant', [{ 
        type: 'text', 
        text: `Here's a comprehensive response with **markdown formatting** and various elements that might cause overflow:

## Code Example That Might Overflow
\`\`\`javascript
function veryLongFunctionNameThatMightCauseHorizontalScrollingIssuesInTheChatInterface(parameterWithVeryLongNameThatGoesOnAndOnAndOn) {
  return parameterWithVeryLongNameThatGoesOnAndOnAndOn.someVeryLongMethodNameThatContinuesForeverAndEver();
}
\`\`\`

### Table That Might Overflow
| Very Long Column Header Name | Another Very Long Column Header | Yet Another Extremely Long Column Header That Goes On |
|------------------------------|----------------------------------|-------------------------------------------------------|
| This cell has very long content that should wrap | More long content here | Even more extremely long content that should test wrapping |

### Long URL Test
Here's a URL without spaces: https://example.com/very/long/path/that/continues/forever/and/ever/without/any/breaks/or/spaces/which/might/cause/horizontal/overflow/issues

And here's some text with a long word: antidisestablishmentarianism` 
      }]),
      createMessage('user', [{ 
        type: 'text', 
        text: 'URLsLikeThisOneWithoutSpacesCouldPotentiallyBreakLayout:https://example.com/very/long/path/that/goes/on/and/on/without/any/breaks/or/spaces/which/might/cause/horizontal/overflow/issues/in/the/chat/interface/component' 
      }]),
    ],
    isLoading: false,
  },
}