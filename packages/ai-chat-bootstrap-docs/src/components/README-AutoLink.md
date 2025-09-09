# Inline API Auto-Linking

Inline MDX code spans like `useAIChat`, `useAIContext`, `useAIFocus`, and `useAIFrontendTool` are automatically converted into links with a hover card that shows signature, description, and (when available) parameter hints.

How

- Implemented in `mdx-components.js` by overriding the `code` renderer for inline code.
- Any inline code matching `/^useAI[A-Za-z]+$/` becomes `<Api name="..." />`.
- The `Api` component lives at `src/components/ApiLink.tsx`.

Tips

- To force-link a non-matching token (or customize label), you can still write `<Api name="useAIChat">useAIChat</Api>` in MDX.
- Fenced code blocks (```tsx) are never auto-linked.
- Add more entries to the API map inside `ApiLink.tsx` if new hooks are added.
