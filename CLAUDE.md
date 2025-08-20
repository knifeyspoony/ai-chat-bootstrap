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
- [ ] Add more message type components
- [ ] Improve TypeScript types for AI SDK integration
- [ ] Add animation/transition support
- [ ] Consider headless component variants