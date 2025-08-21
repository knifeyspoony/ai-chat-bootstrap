# AI SDK Chat Library - Project Memory

## Project Overview
This is a React component library for building AI chat interfaces using the Vercel AI SDK.

## Tech Stack & Tools
- **Package Manager**: pnpm (NOT npm or yarn)
- **React Version**: React 19.1.0
- **UI Framework**: shadcn/ui with Tailwind CSS
- **AI Framework**: Vercel AI SDK v5.x
- **Development Tools**: Storybook, TypeScript, Next.js 15.5.0
- **Testing**: Vitest (configured but tests not implemented yet)

## Project Structure & Conventions

### Import Paths (DO NOT use relative imports)
- **Library components**: `@lib/components/...` (points to `./lib/components/`)
- **Library utils**: `@lib/utils` (points to `./lib/utils`)
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
- **Message Types**: Organized in `lib/components/chat/messages/` subfolder
  - `TextMessage` with markdown rendering
  - `ReasoningMessage`, `FileMessage`, `SourceUrlMessage`, `ToolMessage`
  - `MarkdownMessage` for rich text formatting
- **Chat Components**: Support AI SDK UIMessage format
- **Styling**: Uses shadcn/ui design system with OKLCH colors

## Development Guidelines

### Package Management
```bash
# Always use pnpm
pnpm add <package>
pnpm install
pnpm run storybook
```

### CSS & Styling
- **Main CSS**: `lib/styles.css` (included in npm package)
- **Design System**: Full shadcn/ui tokens with dark/light mode
- **Components**: Use `cn()` utility from `@lib/utils`
- **Imports**: Users must import `'ai-sdk-chat/lib/styles.css'`

### TypeScript Configuration
- **Path Mapping**: Defined in `tsconfig.json`
- **Library Build**: `tsconfig.lib.json` for dist output
- **Components**: Use proper AI SDK types (`UIMessage`, etc.)

### Storybook Setup
- **Stories Location**: Looks in both `src/**/*.stories.*` and `lib/**/*.stories.*`
- **CSS Loading**: Imports `lib/styles.css` in preview.ts
- **Component Examples**: Include markdown rendering demos

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

#### 5. AI SDK v5.0.18 Example - UIMessage Structure
```typescript
// ACTUAL structure from node_modules (verified):
interface UIMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  parts: Array<UIMessagePart>;  // NOT 'content'!
  metadata?: unknown;           // Optional
  // NO 'status' field exists in v5.0.18!
}
```

**Key Rule: If you don't have the actual source code open, don't guess the types!**

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
pnpm run storybook    # Start Storybook
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

## Future TODOs
- [ ] Implement comprehensive test suite
- [ ] Improve TypeScript types for AI SDK integration
- [ ] Add animation/transition support
- [ ] Consider headless component variants