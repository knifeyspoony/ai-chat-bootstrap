# AI SDK Chat Library - Project Memory

## Project Overview
This is a React component library for building AI chat interfaces using the Vercel AI SDK.

## Tech Stack & Tools
- **Package Manager**: pnpm (NOT npm or yarn)
- **React Version**: React 19.1.0
- **UI Framework**: shadcn/ui with Tailwind CSS
- **AI Framework**: Vercel AI SDK v5.x
- **Development Tools**: TypeScript, Next.js 15.5.0
- **Testing**: Vitest (configured but tests not implemented yet)

## Project Structure & Conventions

### Import Paths (DO NOT use relative imports)
- **Library components**: `../../components/...` (points to `./../../components/`)
- **Library utils**: `../../utils` (points to `./lib/utils`)
- **Source files**: `@/...` (points to `./src/`)

### Directory Structure
```
lib/
├── components/
│   ├── chat/
│   │   ├── messages/          # Individual message type components
│   │   ├── chat-message.tsx   # Main message container
│   │   ├── chat-input.tsx     # Input component
│   │   └── chat-container.tsx # Main chat container
│   └── ui/                    # shadcn/ui components
├── utils.ts                   # Utility functions (cn, etc.)
├── styles.css                 # Main CSS with shadcn design tokens
└── index.ts                   # Library exports
```

### Component Architecture
- **Message Types**: Organized in `../../components/chat/messages/` subfolder
  - `TextMessage` with markdown rendering
  - `ReasoningMessage`, `FileMessage`, `SourceUrlMessage`, `ToolMessage`
  - `MarkdownMessage` for rich text formatting
- **Chat Components**: Support AI SDK UIMessage format
- **Styling**: Uses shadcn/ui design system with OKLCH colors

## Development Guidelines

### Zustand Hook Patterns (CRITICAL - Prevents Re-render Loops)

**NEVER include Zustand action functions in useEffect dependencies!**

❌ **Wrong - Causes infinite re-renders:**
```typescript
const setContext = useAIContextStore(state => state.setContext)
const clearContext = useAIContextStore(state => state.clearContext)

useEffect(() => {
  setContext(key, value)
  return () => clearContext(key)
}, [key, value, setContext, clearContext]) // ❌ setContext/clearContext are unstable refs
```

✅ **Correct - Stable dependencies only:**
```typescript
const setContext = useAIContextStore(state => state.setContext)
const clearContext = useAIContextStore(state => state.clearContext)

useEffect(() => {
  setContext(key, value)  
  return () => clearContext(key)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [key, value]) // ✅ Only include actual data that should trigger re-runs
```

**Why this happens:**
- Zustand selectors create **new function references** on every render
- `useAIContextStore(state => state.setContext)` returns a different function each time
- This triggers useEffect on every render, causing infinite loops
- Zustand actions are stable by design - the underlying functions don't change

**Apply this pattern to all hooks:**
- `useAIContext`: `[key, value]` only
- `useAIFrontendTool`: `[tool]` only
- `useAIFocus`: `[focusItem]` only

### Package Management
```bash
# Always use pnpm
pnpm add <package>
pnpm install
```

### CSS & Styling
- **Main CSS**: `lib/styles.css` (included in npm package)
- **Design System**: Full shadcn/ui tokens with dark/light mode
- **Components**: Use `cn()` utility from `../../utils`
- **Imports**: Users must import `'ai-sdk-chat/lib/styles.css'`

### TypeScript Configuration
- **Path Mapping**: Defined in `tsconfig.json`
- **Library Build**: `tsconfig.lib.json` for dist output
- **Components**: Use proper AI SDK types (`UIMessage`, etc.)

## AI SDK Integration

### Type Safety Guidelines (CRITICAL)
**NEVER assume types or interfaces - ALWAYS verify from actual source code first:**

#### 1. Check Actual Type Definitions Before Making Changes
```bash
# Find any interface/type in node_modules
find node_modules -name "*.d.ts" -exec grep -l "InterfaceName" {} \;
# Read the exact definition
grep -A 20 "interface InterfaceName" node_modules/.pnpm/package@version/node_modules/package/dist/index.d.ts

# For React component props
grep -A 15 "interface.*Props" node_modules/@types/react/index.d.ts

# For library-specific types
grep -rn "type SomeType" node_modules/library-name/
```

#### 2. Verify Existing Usage Patterns in Codebase
```bash
# See how types are actually used in this project
grep -r "TypeName" lib/ src/ --include="*.ts" --include="*.tsx"
grep -r ": TypeName" lib/ src/ -A 5 -B 2

# Check existing implementations
grep -r "interface.*Props" lib/ src/ -A 10
```

#### 3. Run TypeScript Compiler for Exact Errors (Not Assumptions)
```bash
pnpm run lint  # Get real TypeScript errors
npx tsc --noEmit  # Type check without building
```

#### 4. Read Component/Library Source Code Directly
```bash
# Read actual component files to understand expected props
cat node_modules/library/dist/Component.d.ts
# Check package.json for exact versions being used
cat package.json | grep "library-name"
```

#### 5. AI SDK v5.0.18 UIMessage Structure (VERIFIED from node_modules)
```typescript
// ACTUAL structure from AI SDK v5.0.18 (verified from node_modules/ai/dist/index.d.ts):
interface UIMessage<METADATA = unknown, DATA_PARTS extends UIDataTypes = UIDataTypes, TOOLS extends UITools = UITools> {
  /**
   * A unique identifier for the message.
   */
  id: string;
  
  /**
   * The role of the message.
   */
  role: 'system' | 'user' | 'assistant';
  
  /**
   * The metadata of the message.
   */
  metadata?: METADATA;
  
  /**
   * The parts of the message. Use this for rendering the message in the UI.
   * 
   * System messages should be avoided (set the system prompt on the server instead).
   * They can have text parts.
   * 
   * User messages can have text parts and file parts.
   * 
   * Assistant messages can have text, reasoning, tool invocation, and file parts.
   */
  parts: Array<UIMessagePart<DATA_PARTS, TOOLS>>;
}

// UIMessagePart Union Type:
type UIMessagePart<DATA_TYPES extends UIDataTypes, TOOLS extends UITools> = 
  | TextUIPart 
  | ReasoningUIPart 
  | ToolUIPart<TOOLS> 
  | DynamicToolUIPart 
  | SourceUrlUIPart 
  | SourceDocumentUIPart 
  | FileUIPart 
  | DataUIPart<DATA_TYPES> 
  | StepStartUIPart;

// Individual Part Types:
type TextUIPart = {
  type: 'text';
  text: string;
  state?: 'streaming' | 'done';
  providerMetadata?: ProviderMetadata;
};

type ReasoningUIPart = {
  type: 'reasoning';
  text: string;
  state?: 'streaming' | 'done';
  providerMetadata?: ProviderMetadata;
};

type FileUIPart = {
  type: 'file';
  mediaType: string;
  filename?: string;
  url: string;  // URL or Data URL
};

type SourceUrlUIPart = {
  type: 'source-url';
  sourceId: string;
  url: string;
  title?: string;
  providerMetadata?: ProviderMetadata;
};

type SourceDocumentUIPart = {
  type: 'source-document';
  sourceId: string;
  mediaType: string;
  title: string;
  filename?: string;
  providerMetadata?: ProviderMetadata;
};

type StepStartUIPart = {
  type: 'step-start';
};

type DataUIPart<DATA_TYPES extends UIDataTypes> = ValueOf<{
  [NAME in keyof DATA_TYPES & string]: {
    type: `data-${NAME}`;
    id?: string;
    data: DATA_TYPES[NAME];
  };
}>;

type ToolUIPart<TOOLS extends UITools = UITools> = ValueOf<{
  [NAME in keyof TOOLS & string]: {
    type: `tool-${NAME}`;
    toolCallId: string;
    // ... different states for input-streaming, input-available, complete, error
  };
}>;
```

**Key Rules:**
- ✅ UIMessage HAS a `parts` property (Array<UIMessagePart>)
- ✅ Each part has a `type` field indicating its content type
- ✅ Text content is in `part.text` for TextUIPart
- ✅ Assistant messages render by mapping over `message.parts`
- ✅ The existing component structure is correct for this format

**CRITICAL:** Always verify types from actual source code, never assume!

### Documentation Reference
- **Main Docs**: https://ai-sdk.dev/docs/reference
- **UIMessage Format**: Used for chat message structure
- **Content Types**: text, reasoning, file, source-url, tool-*, data-*

### Message Rendering
- **Text Content**: Rendered as markdown (react-markdown + remark-gfm)
- **Code Highlighting**: rehype-highlight with theme-aware styling
- **Message Parts**: Each type has dedicated component in messages/ folder

## Build & Distribution

### Library Files
- **Build Command**: `pnpm run build:lib`
- **Output**: `dist/` directory
- **Published Files**: `dist/`, `lib/styles.css`, `README.md`, `LICENSE`

### Components.json Configuration
- **CSS Path**: `lib/styles.css`
- **Components Path**: `lib/components`
- **Utils Path**: `lib/utils`

## Commands to Remember

### Development
```bash
pnpm run dev          # Next.js dev server
pnpm run build:lib    # Build library for npm
pnpm run lint         # ESLint check
```

### Testing
- Vitest configured but tests need implementation
- Should test component rendering and markdown parsing

## Known Issues & Limitations
- Peer dependency warnings with React 19 (lucide-react expects ^18)
- Type issues with AI SDK UIMessage interface (using type assertions as workaround)
- No tests implemented yet for markdown rendering