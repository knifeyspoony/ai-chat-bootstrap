## Studio Implementation TODO

Terminology: a Note becomes `sharedAsSource` (boolean) when the user chooses to share it. Shared notes appear in Sources while still editable in Studio. Built‑in system prompt enrichment already exposes tools, context, and focus items—no custom prompt assembly required.

---

### Phase 0: Naming & Foundations

- [x] Adopt terminology (`sharedAsSource` flag)
- [x] Confirm built‑in enrichment covers tools + context + focus (no duplication)
- [x] Define Types:
  - [x] `Note`: `{ id, title, body, tags, sharedAsSource, updatedAt }`
  - [x] `Source`: derived (note.sharedAsSource)
  - [x] `ToolResult`: `{ id, toolName, ts, data }`
- [ ] Limits guard (token caps) – partially implicit; still add explicit truncation util

### Phase 1: Route & Layout

- [x] Add `/studio` route in demo app
- [x] 3‑pane base grid scaffold
- [x] Panels shells implemented
- [ ] Mobile / narrow responsive collapse
- [ ] Persist open/closed state
- [x] Resizable layout with collapsible sidebars (left sources / right studio)

### Phase 2: State Stores (Zustand)

- [x] `notesStore` implemented
- [x] Derived sources via filter in components
- [x] `toolResultsStore` ring buffer
- [ ] Debounced digest util (currently recompute on send only, no debounce needed yet)
- [ ] `assetsStore` (planned for Studio asset tools)
- [x] Quick-add source creation from Sources panel (shared note shortcut)
- [x] Global active note selection store (allows cross-panel activation)
- [x] Separate direct sources store (user-created independent of notes)
- [x] Sources panel shows direct sources + shared notes

### Phase 3: Context & Focus Integration

- [x] `sourcesDigest` (recomputed on message send)
- [x] `draftsDigest`
- [x] `projectMeta`
- [x] Focus selection (sources panel + chips)
- [x] Focus chips bar visual
- [ ] "Focus All Visible" action
- [x] Dev-time context identity guard (memoization enforcement)

### Phase 4: Frontend Tools (`useAIFrontendTool`)

- [ ] `summarize_focus` (inline only)
- [ ] `cluster_sources` (inline preview or asset?)
- [ ] `generate_outline` (Studio asset)
- [ ] `diff_outline` (Studio asset revision)
- [ ] `create_mindmap` (Studio asset)
- [ ] `stats_sources` (inline)
- [ ] Custom renderers in `ToolResultDock`
- [ ] Asset persistence logic (assetsStore + message watcher)

### Phase 5: Commands

- [ ] UI Commands (`useUIChatCommand`):
  - [ ] `/clear`
  - [ ] `/theme {light|dark|alt}`
  - [ ] `/share {noteId}` (sets `sharedAsSource = true`)
  - [ ] `/unshare {noteId}`
  - [ ] `/export {markdown|json}`
- [ ] AI Commands (`useAIChatCommand`):
  - [ ] `/outline` -> `generate_outline` + optional `diff_outline`
  - [ ] `/cluster` -> `cluster_sources`
  - [ ] `/mindmap` -> `create_mindmap`
  - [ ] `/compare idA idB` (model reasoning, may leverage `summarize_focus` implicitly)
- [ ] Command palette hints surface active commands

### Phase 6: Suggestions

- [ ] Enable suggestions (existing API)
- [ ] Client pre-logic for seeding suggestion prompt (model still finalizes):
  - [ ] ≥2 focused: "Compare the focused sources"
  - [ ] ≥3 sources & none focused: "Cluster related sources"
  - [ ] Outline exists: "Refine the current outline"
  - [ ] Mind map not created: "Create a mind map from sources"
- [ ] Validate dynamic suggestions update after focus/context changes

### Phase 7: UI & Variants

- [ ] Theme toggle (light/dark/alt) using scoped container & CSS vars
- [ ] Chat variants toggles: layout, density, radius
- [ ] `ToolResultDock`: expandable grid (latest first)
- [ ] Empty states for notes, sources, tool results
- [ ] Refactor demo panels to use shadcn/ui primitives (Button, Input, Textarea, ScrollArea, Switch, Badge)
- [ ] Keyboard shortcuts:
  - [ ] `Cmd+K` command menu
  - [ ] `Alt+S` share current note
  - [ ] `Esc` clear active note selection

### Phase 8: Persistence (Optional)

- [ ] LocalStorage hydration for notes + shared flags
- [ ] Version key for future schema migrations

### Phase 9: Performance / Limits

- [ ] Debounce digest recompute (400ms)
- [ ] Memoize clustering per stable hash of sources
- [ ] Truncate note excerpts in digests (first 500 chars)
- [ ] Guard tool execution when no applicable sources/focus

### Phase 10: QA & Polish

- [ ] Lint & typecheck all packages
- [ ] Manual test: share/unshare reflects in answers quickly
- [ ] Validate focus chip removal narrows answer scope
- [ ] Theme switching does not break tool renderers
- [ ] Suggestions adapt after context changes

### Phase 11: Documentation

- [ ] Add README section: "Studio Demo Overview"
- [ ] Inline code comments for tools & commands
- [ ] Optional MDX "Tour" page linking to core files

### Stretch Goals (Optional)

- [ ] Drag reorder notes / sources (affects priority ordering)
- [ ] Client similarity search (embeddings stub + cosine)
- [ ] Bulk share/unshare multi-select
- [ ] Visual outline diff (added/removed color coding)

### Risks / Mitigations

- Token bloat -> enforce caps & truncation before enrichment (still rely on built-in safety)
- Clustering performance -> small dataset guard; lazy compute
- Visual clutter -> collapsible panels + dock
- Command namespace collisions -> simple registry check

### Definition of Done

- `/studio` route rendered with tri‑pane layout
- Notes create/edit/share flow works
- Sources panel reflects shared notes live
- Focus items influence AI responses (qualitative verification)
- ≥4 frontend tools with custom renderers
- UI + AI commands operational
- Suggestions contextually adaptive
- Theming & variant toggles functional
- Documentation updated

---

Added distinction: "Studio Asset Tools" (persist output) vs "Inline Tools" (chat only). Asset tools will attach `studioAsset` metadata for watcher to store.

Last updated: 2025-09-11
