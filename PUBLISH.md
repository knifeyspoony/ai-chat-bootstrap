# Publishing ai-sdk-chat to npm

This guide walks through publishing the `ai-sdk-chat` library to npm for the first time.

## Prerequisites

- Node.js and pnpm installed
- npm account (create at https://www.npmjs.com/signup)
- Clean git working directory

## Step-by-Step Publishing Guide

### Step 1: Build the Library

First, ensure the library builds correctly:

```bash
# Clean any existing build artifacts
rm -rf dist/

# Build the library
pnpm run build:lib
```

This creates:
- `dist/index.js` - CommonJS build
- `dist/index.mjs` - ESM build  
- `dist/index.d.ts` - TypeScript definitions

Verify the build:
```bash
ls -la dist/
# Should show index.js, index.mjs, index.d.ts and other compiled files
```

### Step 2: Update Package Metadata

Edit `package.json` to update placeholder values:

```json
{
  "name": "ai-sdk-chat",
  "version": "0.1.0",  // Consider if this should be 0.0.1 for first release
  "author": "Your Name <your.email@example.com>",  // Update this
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yourusername/ai-sdk-chat.git"  // Update this
  },
  "bugs": {
    "url": "https://github.com/yourusername/ai-sdk-chat/issues"  // Update this
  },
  "homepage": "https://github.com/yourusername/ai-sdk-chat#readme"  // Update this
}
```

### Step 3: Test Package Locally

Before publishing, test the package works correctly:

```bash
# Create a package tarball
npm pack

# This creates ai-sdk-chat-0.1.0.tgz
# Check the contents
tar -tzf ai-sdk-chat-*.tgz

# Verify it includes:
# - package/dist/
# - package/lib/styles.css
# - package/README.md
# - package/LICENSE
# - package/package.json
```

#### Test in Another Project (Optional)

```bash
# In a test project directory
cd ../test-project
pnpm add file:../ai-sdk-chat/ai-sdk-chat-0.1.0.tgz

# Test importing
# Create test.mjs:
echo "import { ChatContainer } from 'ai-sdk-chat';" > test.mjs
node test.mjs
```

### Step 4: Check Package Name Availability

```bash
# Check if the name is available
npm view ai-sdk-chat

# If you get "npm ERR! 404", the name is available
# If package info is shown, you'll need a different name
```

### Step 5: Login to npm

```bash
# Login to npm (creates ~/.npmrc with auth token)
npm login

# Verify you're logged in
npm whoami
```

### Step 6: Final Pre-Publish Checklist

- [ ] `pnpm run lint` passes with no errors
- [ ] `dist/` directory exists with built files
- [ ] Package.json metadata is updated
- [ ] Version number is appropriate (0.1.0 or 0.0.1)
- [ ] LICENSE file exists
- [ ] README.md has usage instructions

### Step 7: Publish to npm

```bash
# Dry run first (shows what would be published)
npm publish --dry-run

# If everything looks good, publish for real
npm publish

# Or if you want to publish as beta/next tag
npm publish --tag beta
```

The `prepublishOnly` script will automatically run:
1. `npm run lint` - Ensure code quality
2. `npm run build:lib` - Rebuild the library

### Step 8: Verify Publication

```bash
# Check it's on npm
npm view ai-sdk-chat

# Install in a test project
cd ../test-project
pnpm add ai-sdk-chat
```

## Post-Publish Steps

1. **Create a git tag:**
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. **Update README** with installation instructions:
   ```bash
   npm install ai-sdk-chat
   # or
   pnpm add ai-sdk-chat
   ```

3. **Test the published package** in a new project

## Troubleshooting

### Common Issues

**Build fails:**
```bash
# Clear TypeScript cache
rm -rf dist/ tsconfig.lib.tsbuildinfo
pnpm run build:lib
```

**Permission denied:**
```bash
# You might need to use npm with your username scope
npm publish --access public
```

**Package too large:**
```bash
# Check package size
npm pack --dry-run 2>&1 | grep "npm notice package size"

# Review .npmignore to exclude unnecessary files
```

**Name already taken:**
- Use a scoped package name: `@yourusername/ai-sdk-chat`
- Update package.json name field
- Publish with: `npm publish --access public`

## Version Management

For subsequent releases:

```bash
# Patch release (0.1.0 -> 0.1.1)
npm version patch

# Minor release (0.1.0 -> 0.2.0)
npm version minor

# Major release (0.1.0 -> 1.0.0)
npm version major

# Then publish
npm publish
```

## NPM Scripts Reference

- `pnpm run build:lib` - Build the library for distribution
- `pnpm run lint` - Run ESLint checks
- `pnpm publish` - Publish to npm (runs prepublishOnly first)
- `npm pack` - Create a local tarball for testing

## Required Files for Publishing

The package.json `files` field specifies what gets published:
- `dist/` - Compiled JavaScript and TypeScript definitions
- `lib/styles.css` - Required CSS styles
- `README.md` - Package documentation
- `LICENSE` - License file

Files automatically included:
- `package.json`
- `README.md` (if exists)
- `LICENSE` (if exists)

Files excluded by .npmignore:
- Source files (src/, app/, components/)
- Config files (next.config.ts, etc.)
- Development files (.next/, node_modules/)
- Test files