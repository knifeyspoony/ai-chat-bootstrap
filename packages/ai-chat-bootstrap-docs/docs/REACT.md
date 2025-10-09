# 🚀 The Ultimate React Performance Optimization Framework

_Extracted from production-grade applications_

## Table of Contents

1. [Core Principles](#core-principles)
2. [The Performance Hierarchy](#the-performance-hierarchy)
3. [Pattern Catalog](#pattern-catalog)
4. [Decision Framework](#decision-framework)
5. [Implementation Checklist](#implementation-checklist)
6. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
7. [Measuring Success](#measuring-success)

---

## 🎯 Core Principles

### The 5 Laws of React Performance

1. **Law of Minimal Re-renders**

   - A component should only re-render when its output will change
   - Use React.memo with custom comparisons to enforce this

2. **Law of Stable References**

   - Objects, arrays, and functions should maintain stable references across renders
   - Use useMemo and useCallback to achieve stability

3. **Law of Computation Deferral**

   - Expensive computations should be deferred and memoized
   - Non-critical updates should use useDeferredValue

4. **Law of State Locality**

   - State should live as close to where it's used as possible
   - Lift state only when necessary for sharing

5. **Law of Subscription Efficiency**
   - Components should only subscribe to the exact data they need
   - Use granular selectors and shallow equality checks

---

## 📊 The Performance Hierarchy

Apply optimizations in this order for maximum impact:

```
Level 1: Component Memoization (50-70% improvement)
    ↓
Level 2: Computation Memoization (20-30% improvement)
    ↓
Level 3: Update Deferral (10-20% improvement)
    ↓
Level 4: Event Optimization (5-10% improvement)
    ↓
Level 5: Bundle Optimization (5-10% improvement)
```

---

## 📖 Pattern Catalog

### Pattern 1: React.memo with Custom Comparison

**When to use:** For any component that receives complex props

```typescript
// ❌ Bad - Re-renders on every parent update
export const Component = (props) => {
  /* ... */
};

// ✅ Good - Only re-renders when specific props change
export const Component = React.memo(ComponentImpl, (prev, next) => {
  // Fast path: reference equality
  if (prev.data === next.data) return true;

  // Granular checks for primitives
  if (prev.id !== next.id) return false;
  if (prev.status !== next.status) return false;

  // Deep equality only for complex objects (expensive, do last)
  return isEqual(prev.items, next.items);
});
```

**Decision criteria:**

- Use when component has expensive render logic
- Use when component receives object/array props
- Skip for components that always need latest props

### Pattern 2: useMemo for Expensive Computations

**When to use:** For any computation that takes >1ms or creates new objects

```typescript
// ❌ Bad - Recalculates on every render
const processedData = data.map((item) => ({
  ...item,
  computed: expensiveFunction(item),
}));

// ✅ Good - Only recalculates when data changes
const processedData = useMemo(
  () =>
    data.map((item) => ({
      ...item,
      computed: expensiveFunction(item),
    })),
  [data]
);
```

**Decision criteria:**

- Use for array transformations (map, filter, reduce)
- Use for object creation in render
- Use for complex calculations
- Skip for simple property access

### Pattern 3: useCallback for Event Handlers

**When to use:** Only when the function is a dependency or passed to memoized children

```typescript
// ❌ Bad - Creates new function every render
const handleClick = () => {
  doSomething(value);
};

// ✅ Good - Stable function reference
const handleClick = useCallback(() => {
  doSomething(value);
}, [value]);

// 🎯 Best - Use refs for values that shouldn't trigger updates
const valueRef = useRef(value);
valueRef.current = value;
const handleClick = useCallback(() => {
  doSomething(valueRef.current);
}, []); // Empty deps - maximally stable
```

**Decision criteria:**

- Use when passed to memoized child components
- Use when in dependency arrays
- Skip for inline handlers with no dependencies

### Pattern 4: useDeferredValue for Non-Critical Updates

**When to use:** For updates that can lag behind user input

```typescript
// ❌ Bad - Everything updates synchronously
const filtered = items.filter((item) => item.matches(query));
```

```typescript
// ✅ Good - Non-critical updates deferred
const deferredQuery = useDeferredValue(query);
const filtered = useMemo(
  () => items.filter((item) => item.matches(deferredQuery)),
  [items, deferredQuery]
);
```

**Decision criteria:**

- Use for search results, analytics panels, large list filtering
- Avoid for mission-critical UI (validation, buttons)

### Pattern 5: Event Throttling and Debouncing

**When to use:** High-frequency events like scroll, resize, typing

```typescript
const handleScroll = useMemo(
  () =>
    throttle(() => {
      // ...
    }, 100),
  []
);
```

**Decision criteria:**

- Use throttle for continuous updates (scroll)
- Use debounce for bursty updates (search input)
- Always cancel on unmount

---

## 🧠 Decision Framework

1. **Profile First**
   - Use React DevTools Profiler
   - Identify components with >16ms render time
2. **Stabilize Props**
   - Ensure all props have stable identities
   - Convert inline objects/arrays to useMemo
3. **Memoize Computations**
   - Cache expensive operations
   - Move result caching out of render when possible
4. **Split Layout**
   - Separate slow and fast updates
   - Use Suspense for asynchronous work
5. **Optimize Events**
   - Throttle or debounce heavy handlers
   - Use requestAnimationFrame for visual updates

---

## ✅ Implementation Checklist

### Component-Level

- [ ] Wrapped with React.memo (when appropriate)
- [ ] Stable function props via useCallback
- [ ] Derived data memoized with useMemo
- [ ] Event handlers throttled/debounced
- [ ] Heavy computation moved outside render

### State Management

- [ ] Minimal state surface
- [ ] Derived state kept out of React state
- [ ] Context usage minimized (split contexts)
- [ ] Zustand selectors with shallow equality (if applicable)

### Rendering Patterns

- [ ] Lazy-loaded heavy components
- [ ] Suspense boundaries around async work
- [ ] Virtualized large lists
- [ ] Error boundaries around risky components

### Bundle Strategy

- [ ] Code-splitting for rarely used routes
- [ ] Dynamic imports for large vendor modules
- [ ] Tree-shaking verified
- [ ] Analyze bundle with source-map-explorer

---

## 🚫 Anti-Patterns to Avoid

### 1. Overusing Context

```typescript
// ❌ Bad - Single context for everything
const AppContext = createContext({
  user: null,
  theme: "light",
  settings: {},
  notifications: [],
});
```

```typescript
// ✅ Good - Split contexts
const UserContext = createContext(null);
const ThemeContext = createContext("light");
const NotificationsContext = createContext([]);
```

### 2. Inline Object Creation

```typescript
// ❌ Bad - New object every render
<Component style={{ margin: 10 }} />;
```

```typescript
// ✅ Good - Stable reference
const style = useMemo(() => ({ margin: 10 }), []);
<Component style={style} />;
```

### 3. Index as Key in Dynamic Lists

```typescript
// ❌ Bad - Causes reconciliation issues
{
  items.map((item, index) => <Item key={index} />);
}
```

```typescript
// ✅ Good - Stable unique key
{
  items.map((item) => <Item key={item.id} />);
}
```

### 4. Mutating State

```typescript
// ❌ Bad - React won't detect change
state.items.push(newItem);
setState(state);
```

```typescript
// ✅ Good - Create new reference
setState({ ...state, items: [...state.items, newItem] });
```

### 5. Expensive Initial State

```typescript
// ❌ Bad - Runs on every render
const [state] = useState(expensiveComputation());
```

```typescript
// ✅ Good - Runs once
const [state] = useState(() => expensiveComputation());
```

---

## 📈 Measuring Success

### Key Metrics

1. **Render Time**

   - Target: <16ms per frame (60fps)
   - Tool: React DevTools Profiler

2. **Re-render Count**

   - Target: <5 per user interaction
   - Tool: React DevTools Highlight Updates

3. **Time to Interactive (TTI)**

   - Target: <3 seconds
   - Tool: Lighthouse

4. **Input Latency**

   - Target: <50ms
   - Tool: Chrome Performance Tab

5. **Bundle Size**
   - Target: <200KB initial
   - Tool: webpack-bundle-analyzer

### Performance Budget

| Metric                 | Budget | Critical |
| ---------------------- | ------ | -------- |
| Initial Bundle         | 200KB  | 500KB    |
| Render Time            | 16ms   | 33ms     |
| Input Delay            | 50ms   | 100ms    |
| Re-renders/interaction | 5      | 15       |
| Memory Usage           | 50MB   | 128MB    |

### Monitoring Code

```typescript
// Add to development builds
if (process.env.NODE_ENV === "development") {
  const slowComponents = new Set();

  React.Profiler = ({ id, phase, actualDuration }) => {
    if (actualDuration > 16) {
      if (!slowComponents.has(id)) {
        console.warn(`🐌 Slow component: ${id} took ${actualDuration}ms`);
        slowComponents.add(id);
      }
    }
  };
}
```

---

## 🎯 Quick Wins Checklist

For immediate 50%+ performance improvement:

1. **Add React.memo to top 5 heaviest components**
2. **Add useDeferredValue to search/filter inputs**
3. **Memoize array transformations in render**
4. **Add throttling to streaming updates**
5. **Split components that mix fast/slow updates**

---

## 📚 Further Reading

- [React Profiler API](https://react.dev/reference/react/Profiler)
- [Web Vitals](https://web.dev/vitals/)
- [React Performance Patterns](https://react.dev/learn/render-and-commit)
- [Bundle Splitting Guide](https://webpack.js.org/guides/code-splitting/)

---

_This framework is battle-tested in production at scale. Apply these patterns consistently for predictable, high-performance React applications._
