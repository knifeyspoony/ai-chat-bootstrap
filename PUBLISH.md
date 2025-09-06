# Publishing ai-chat-bootstrap to npm

Guide for first-time publication of `ai-chat-bootstrap`.

## Prerequisites

- Node.js 18+ and pnpm installed
- npm account (https://www.npmjs.com/signup)
- Clean git working directory (no unstaged changes)
- Logged into npm (`npm login`)

## 1. Build the Library

From repo root (will build the package via workspace script):

```bash
pnpm run build:lib
```

Produces (inside `packages/ai-chat-bootstrap/dist`):

- `index.js` (CJS)
- `index.mjs` (ESM)
- `index.d.ts` (types)
- `styles.css`

Verify:

```bash
ls -1 packages/ai-chat-bootstrap/dist
```

## 2. Verify Package Metadata

Check `packages/ai-chat-bootstrap/package.json` key fields:

- name: `ai-chat-bootstrap`
- version: bump if already published
- repository / bugs / homepage: correct GitHub URLs
- files: includes `dist`
- `sideEffects`: includes `dist/styles.css`

## 3. Local Pack & Inspect

```bash
cd packages/ai-chat-bootstrap
npm pack --dry-run
```

Ensure output shows:

- package/dist/\* (js, mjs, d.ts, css)
- package/README.md
- package/LICENSE
- package/package.json

If good, optionally create the real tarball for local install testing:

```bash
npm pack
tar -tzf ai-chat-bootstrap-*.tgz | sed -n '1,40p'
```

Test in a scratch project (optional):

```bash
mkdir -p /tmp/ai-chat-bootstrap-test && cd /tmp/ai-chat-bootstrap-test
pnpm init -y
pnpm add ../path/to/repo/packages/ai-chat-bootstrap/ai-chat-bootstrap-*.tgz react react-dom
node -e "require('ai-chat-bootstrap')"
```

## 4. Name Availability (only first time)

```bash
npm view ai-chat-bootstrap || echo 'Name free (404 expected for first publish)'
```

## 5. Final Checklist

- [ ] Clean git status
- [ ] `pnpm run build:lib` succeeded
- [ ] Lint passes: `pnpm --filter ai-chat-bootstrap lint`
- [ ] Types pass: `pnpm --filter ai-chat-bootstrap typecheck`
- [ ] Dist contains JS, MJS, DTS, CSS
- [ ] README & LICENSE present
- [ ] Version correct (e.g. 0.1.0)

## 6. Publish

Inside `packages/ai-chat-bootstrap`:

```bash
npm publish --access public --dry-run
```

Review file list then:

```bash
npm publish --access public
```

Optionally tag pre-release:

```bash
npm publish --tag beta --access public
```

## 7. Verify

```bash
npm view ai-chat-bootstrap version
```

Install somewhere fresh:

```bash
mkdir -p /tmp/verify-ai-chat-bootstrap && cd /tmp/verify-ai-chat-bootstrap
pnpm init -y
pnpm add ai-chat-bootstrap react react-dom
grep -R "ai-chat-bootstrap" node_modules/ai-chat-bootstrap/package.json
```

## 8. Tag & Push

```bash
git tag v$(node -p "require('./packages/ai-chat-bootstrap/package.json').version")
git push origin --tags
```

## 9. Bumping Version Later

From package dir:

```bash
npm version patch   # or minor / major
npm publish --access public
```

## Troubleshooting

| Issue           | Fix                                                                          |
| --------------- | ---------------------------------------------------------------------------- |
| 403 / Forbidden | Ensure you own the name or use a scoped name (@your-scope/ai-chat-bootstrap) |
| Files missing   | Check `files` array & run `npm pack --dry-run`                               |
| Missing CSS     | Ensure `sideEffects` includes `dist/styles.css`                              |
| Type errors     | Run `pnpm --filter ai-chat-bootstrap typecheck`                              |

## Required Files Summary

- dist/index.js
- dist/index.mjs
- dist/index.d.ts
- dist/styles.css
- README.md
- LICENSE
- package.json

## Quick One-Liner (after checks)

```bash
pnpm --filter ai-chat-bootstrap lint && pnpm --filter ai-chat-bootstrap typecheck && pnpm --filter ai-chat-bootstrap build && (cd packages/ai-chat-bootstrap && npm publish --access public)
```

Done.
