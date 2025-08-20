# AI SDK Chat

A high-performance React 19 AI chat SDK with deep application integration capabilities. Built with shadcn/ui components and optimized for zero unnecessary renders.

## Features

- 🚀 **Zero Unnecessary Renders** - Surgical state updates with stable references
- 🎨 **Fully Reskinnable** - Complete theming control with sensible defaults
- 🔧 **Deep Integration** - Share component state, register tools, manage focus
- 📦 **Framework Isolated** - Clean boundaries prevent state pollution
- 🔒 **Type-Safe** - Full TypeScript support with runtime validation
- ⚡ **React 19 Optimized** - Leverages latest React features for performance

## Installation

```bash
npm install ai-sdk-chat
# or
yarn add ai-sdk-chat
# or
pnpm add ai-sdk-chat
```

## Quick Start

```tsx
import { AISDKChatProvider, AISDKChat } from 'ai-sdk-chat'

function App() {
  return (
    <AISDKChatProvider apiKey={process.env.OPENAI_API_KEY}>
      <YourApp />
      <AISDKChat />
    </AISDKChatProvider>
  )
}
```

## Core Hooks

### `useAIContext`
Share application state with the AI chat context without causing re-renders.

```tsx
function UserProfile() {
  const user = useCurrentUser()
  
  // This won't re-render the chat interface
  useAIContext('currentUser', user)
}
```

### `useAIFrontendTool`
Register tools that execute in the browser with optional custom rendering.

```tsx
function DataTools() {
  useAIFrontendTool({
    name: 'create_chart',
    description: 'Creates data visualizations',
    parameters: z.object({
      data: z.array(z.any()),
      type: z.enum(['bar', 'line', 'pie'])
    }),
    execute: async (params) => {
      const chart = await createChart(params)
      return { chartId: chart.id }
    },
    render: ({ result }) => <ChartDisplay id={result.chartId} />
  })
}
```

### `useAIBackendTool`
Register server-side tools that don't affect frontend state. Provide an `execute` function to handle the tool logic.

```tsx
function DatabaseTools() {
  useAIBackendTool({
    name: 'query_database',
    description: 'Query application database',
    parameters: z.object({
      query: z.string()
    }),
    execute: async (params) => {
      const result = await fetch('/api/query', {
        method: 'POST',
        body: JSON.stringify(params)
      })
      return result.json()
    }
  })
}
```

### `useAIFocus`
Highlight UI elements for contextual AI assistance.

```tsx
function CodeEditor() {
  const [selection, setSelection] = useState(null)
  
  useAIFocus({
    id: 'code-selection',
    active: !!selection,
    context: selection,
    preview: selection && <CodePreview code={selection} />
  })
}
```

## Advanced Configuration

```tsx
<AIProvider
  apiKey={process.env.OPENAI_API_KEY}
  model="gpt-4-turbo-preview"
  theme={{
    primary: '#0070f3',
    background: '#ffffff',
    text: '#000000',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '12px'
  }}
  position="bottom-right"
  hotkey="cmd+k"
  maxTokens={4096}
  temperature={0.7}
  systemMessage="You are a helpful assistant for a data analytics platform."
>
  <App />
</AIProvider>
```

## Performance

The SDK is designed for optimal performance:

- **Stable References**: Prevents unnecessary re-renders through careful reference management
- **Batched Updates**: Multiple state changes are batched into single updates
- **Selective Subscriptions**: Components only re-render when their specific data changes
- **Lazy Serialization**: Context is only serialized when needed for AI messages
- **Virtual Scrolling**: Large chat histories use virtualization

## Styling

### Using Default Theme

```tsx
import 'ai-sdk-chat/styles/default.css'
```

### Custom Theme

```tsx
const customTheme = {
  primary: '#your-color',
  background: '#your-bg',
  text: '#your-text',
  // ... see ThemeConfig type for all options
}

<AISDKChatProvider theme={customTheme}>
  <App />
</AISDKChatProvider>
```

### CSS Variables

```css
:root {
  --ai-chat-primary: #0070f3;
  --ai-chat-background: #ffffff;
  --ai-chat-text: #000000;
  --ai-chat-border: #e5e5e5;
  --ai-chat-radius: 12px;
}
```

## TypeScript

Full TypeScript support with exported types:

```tsx
import type { 
  AIContext,
  FrontendTool,
  BackendTool,
  FocusItem,
  ChatMessage,
  ThemeConfig
} from 'ai-sdk-chat'
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- React 19.0+

## License

MIT