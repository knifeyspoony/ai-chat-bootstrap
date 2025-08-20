# AI SDK Chat Architecture

## Overview

AI SDK Chat is a React 19-based npm package that provides a fully-featured, reskinnable AI chat interface with deep integration capabilities for host applications. The SDK enables seamless state sharing between host applications and the chat interface while maintaining optimal performance through careful render optimization.

## Core Design Principles

### 1. **Zero Unnecessary Renders**
Every state update is carefully scoped to prevent cascading re-renders. We use stable references, memoization, and surgical subscriptions to ensure components only re-render when their specific data changes.

### 2. **Framework Isolation**
The SDK maintains clear boundaries between its internal state and the host application, preventing state pollution and ensuring multiple instances can coexist.

### 3. **Type-Safe Integration**
Full TypeScript support with runtime validation ensures contract adherence between the SDK and host application.

### 4. **Progressive Enhancement**
Basic chat functionality works out-of-the-box, with advanced features (tools, context sharing, focus items) available through opt-in hooks.

## State Management Architecture

### Registry Pattern with Stable References

```typescript
// Core registry uses stable refs to prevent re-renders
class AISDKChatContextRegistry {
  private contexts = new Map<string, {
    ref: { current: any },
    version: number,
    subscribers: Set<() => void>
  }>()
  
  private tools = new Map<string, ToolRegistration>()
  private focusItems = new Map<string, FocusItem>()
  
  // Surgical updates - only notify affected subscribers
  updateContext(key: string, value: any) {
    const entry = this.contexts.get(key)
    if (entry) {
      entry.ref.current = value
      entry.version++
      entry.subscribers.forEach(cb => cb())
    }
  }
}
```

### Hook Architecture

Each hook uses **subscription-based updates** to prevent unnecessary renders:

```typescript
// Only re-renders when THIS specific context changes
function useAIContext<T>(key: string, value: T) {
  const registry = useRegistry()
  const [version, setVersion] = useState(0)
  
  useEffect(() => {
    const unsubscribe = registry.subscribeToContext(key, () => {
      setVersion(v => v + 1)
    })
    
    // Update without causing re-render if value hasn't changed
    registry.updateContextIfChanged(key, value)
    
    return unsubscribe
  }, [key, value])
  
  return registry.getContext(key)
}
```

## API Design

### 1. `useAIContext`
Shares application state with the AI chat context.

```typescript
function MyComponent() {
  const userData = useUserData()
  
  // Only re-renders this component if userData changes
  useAIContext('currentUser', userData)
  
  // Can also use with computed values
  useAIContext('permissions', useMemo(() => 
    computePermissions(userData), [userData]
  ))
}
```

**Render Optimization:**
- Uses stable object references via `useRef`
- Compares values using shallow equality
- Updates system message without re-rendering chat UI

### 2. `useAIFrontendTool`
Registers tools that execute in the browser with optional custom rendering.

```typescript
function DataVisualization() {
  useAIFrontendTool({
    name: 'visualize_data',
    description: 'Creates interactive data visualizations',
    parameters: z.object({
      data: z.array(z.any()),
      chartType: z.enum(['bar', 'line', 'scatter'])
    }),
    
    execute: async (params) => {
      // Runs in browser, can access DOM/component state
      const chart = await createChart(params)
      return { chartId: chart.id }
    },
    
    // Optional: Custom rendering for tool results
    render: ({ result, params }) => (
      <ChartDisplay chartId={result.chartId} />
    )
  })
}
```

**Render Optimization:**
- Tool registration uses stable references
- Execute functions are memoized
- Render components use React.memo by default

### 3. `useAIBackendTool`
Registers server-side tools that don't affect frontend state.

```typescript
function DatabaseQuery() {
  useAIBackendTool({
    name: 'query_database',
    description: 'Executes SQL queries against the database',
    parameters: z.object({
      query: z.string(),
      database: z.string()
    }),
    
    // This indicates it should be executed server-side
    endpoint: '/api/tools/database-query',
    
    // Optional: Transform result before sending to AI
    transformResult: (result) => ({
      summary: summarizeResults(result),
      rowCount: result.rows.length
    })
  })
}
```

**Render Optimization:**
- Backend tools don't trigger frontend re-renders
- Results are streamed directly to chat without state updates
- Only the chat message component re-renders

### 4. `useAIFocus`
Manages focused UI elements for contextual AI assistance.

```typescript
function CodeEditor() {
  const [selectedCode, setSelectedCode] = useState(null)
  
  useAIFocus({
    id: 'code-selection',
    active: !!selectedCode,
    context: selectedCode ? {
      type: 'code',
      language: 'typescript',
      content: selectedCode,
      lineNumbers: getLineNumbers(selectedCode)
    } : null,
    
    // Optional: Visual indicator in chat
    preview: selectedCode ? (
      <CodePreview code={selectedCode} />
    ) : null
  })
}
```

**Render Optimization:**
- Focus items use weak references
- Only active focus items are included in system message
- Preview components are lazily rendered

## Render Loop Prevention Strategies

### 1. **Stable Reference Pool**
```typescript
class ReferencePool {
  private pool = new Map<string, WeakRef<any>>()
  
  getStableRef<T>(key: string, factory: () => T): T {
    const existing = this.pool.get(key)?.deref()
    if (existing) return existing
    
    const newRef = factory()
    this.pool.set(key, new WeakRef(newRef))
    return newRef
  }
}
```

### 2. **Batched Updates**
```typescript
class UpdateBatcher {
  private pending = new Map<string, any>()
  private scheduled = false
  
  schedule(key: string, value: any) {
    this.pending.set(key, value)
    
    if (!this.scheduled) {
      this.scheduled = true
      queueMicrotask(() => {
        this.flush()
        this.scheduled = false
      })
    }
  }
  
  private flush() {
    // Single update for all pending changes
    registry.batchUpdate(this.pending)
    this.pending.clear()
  }
}
```

### 3. **Selective Subscriptions**
```typescript
function useSelectiveSubscription<T>(
  selector: (state: AIState) => T,
  equalityFn = Object.is
) {
  const [value, setValue] = useState(() => selector(getState()))
  
  useEffect(() => {
    let previousValue = value
    
    return subscribe((state) => {
      const newValue = selector(state)
      if (!equalityFn(previousValue, newValue)) {
        previousValue = newValue
        setValue(newValue)
      }
    })
  }, [])
  
  return value
}
```

## System Message Generation

The system message is generated efficiently without triggering renders:

```typescript
class SystemMessageGenerator {
  private cache = new Map<string, string>()
  private version = 0
  
  generate(): string {
    const cacheKey = this.computeCacheKey()
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }
    
    const message = this.buildMessage({
      contexts: this.getActiveContexts(),
      tools: this.getRegisteredTools(),
      focusItems: this.getActiveFocusItems()
    })
    
    this.cache.set(cacheKey, message)
    return message
  }
  
  private computeCacheKey(): string {
    // Version-based caching
    return `${this.version}-${this.getStateHash()}`
  }
}
```

## Package Structure

```
ai-sdk-chat/
├── src/
│   ├── core/
│   │   ├── registry.ts        # Central state registry
│   │   ├── subscriptions.ts   # Subscription management
│   │   └── batching.ts        # Update batching logic
│   ├── hooks/
│   │   ├── useAIContext.ts
│   │   ├── useAIFrontendTool.ts
│   │   ├── useAIBackendTool.ts
│   │   └── useAIFocus.ts
│   ├── components/
│   │   ├── AISDKChatInterface.tsx  # Main chat component
│   │   ├── ToolRenderer.tsx   # Custom tool rendering
│   │   └── FocusPreview.tsx   # Focus item previews
│   ├── providers/
│   │   └── AISDKChatProvider.tsx     # Root provider component
│   └── utils/
│       ├── memoization.ts     # Memoization utilities
│       └── equality.ts        # Equality checking
├── styles/
│   └── default.css            # Default theme (CSS modules)
└── package.json
```

## Performance Guarantees

1. **Context Updates**: O(1) lookup, O(s) notification where s = subscribers to that specific context
2. **Tool Registration**: O(1) insertion, no renders triggered
3. **Focus Changes**: O(1) update, only focus preview component re-renders
4. **System Message Generation**: Cached and computed async, doesn't block UI
5. **Message Streaming**: Uses React 19 streaming features, progressive rendering

## Integration Example

```typescript
// App.tsx
import { AIProvider, ChatInterface, useAIContext, useAIFrontendTool } from 'ai-sdk-chat';

function App() {
  return (
    <AIProvider 
      apiKey={process.env.OPENAI_API_KEY}
      theme={{
        primary: '#0070f3',
        fontFamily: 'Inter'
      }}
    >
      <Dashboard />
      <ChatInterface position="bottom-right" />
    </AIProvider>
  )
}

function Dashboard() {
  const metrics = useMetrics()
  
  // Share metrics with AI context
  useAIContext('dashboardMetrics', metrics)
  
  // Register a tool for data export
  useAIFrontendTool({
    name: 'export_data',
    description: 'Exports dashboard data to various formats',
    parameters: z.object({
      format: z.enum(['csv', 'json', 'excel']),
      dateRange: z.object({
        start: z.string(),
        end: z.string()
      })
    }),
    execute: async (params) => {
      const data = await fetchDataForExport(params.dateRange)
      return exportToFormat(data, params.format)
    }
  })
  
  return <DashboardUI />
}
```

## Advanced Optimization Techniques

### 1. **Lazy Context Serialization**
Contexts are only serialized when needed for the system message:

```typescript
registry.registerContext('largeDataset', {
  get: () => computeExpensiveData(),
  serialize: (data) => summarizeForAI(data),
  ttl: 5000 // Cache for 5 seconds
})
```

### 2. **Differential Updates**
Only send changes to the AI, not the entire context:

```typescript
class DifferentialUpdater {
  private lastSnapshot: any = {}
  
  computeDiff(current: any): any {
    const diff = deepDiff(this.lastSnapshot, current)
    this.lastSnapshot = current
    return diff
  }
}
```

### 3. **Virtual Scrolling for Chat**
Large chat histories use virtual scrolling:

```typescript
<VirtualizedChat
  messages={messages}
  overscan={3}
  estimatedMessageHeight={80}
/>
```

## Testing Strategy

1. **Render Count Tests**: Verify components render expected number of times
2. **Memory Leak Tests**: Ensure proper cleanup of subscriptions
3. **Performance Benchmarks**: Track registry operation performance
4. **Integration Tests**: Test with multiple simultaneous registrations

## Future Considerations

1. **Web Worker Integration**: Move heavy computations off main thread
2. **WASM Modules**: For performance-critical serialization
3. **Multiplayer Support**: Multiple users sharing same chat context
4. **Plugin System**: Allow third-party tool packages