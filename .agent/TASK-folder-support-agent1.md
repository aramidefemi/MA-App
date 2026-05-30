# Task — Folder Support / Agent 1
## FileTree component

**Agent:** 1 of 3  
**Reads:** `BOOTSTRAP.md`, `src/app.css`, `src/lib/components/Editor.svelte` (for pattern reference)  
**Produces:** `src/lib/components/FileTree.svelte`, `HANDOFF-agent1.md`, `DECISIONS-folder-support-agent1.md`  
**Must NOT touch:** Any file not listed above under Produces

---

## Your job

Build one component: `FileTree.svelte`.

It receives a folder path, reads the directory, and renders a clickable
list of `.md` files. It knows nothing about the editor. It knows nothing
about saving. It just shows files and tells the parent when one is clicked.

---

## Hard limits

- **One file created:** `src/lib/components/FileTree.svelte` only
- **No new npm packages.** Use `@tauri-apps/plugin-fs` which is already installed.
- **Max 160 lines** including styles. If you're going over, you're doing too much.
- **No icons.** Text only. Directories get `▶` / `▼` arrows, files get nothing.
- **No inline styles.** CSS variables from `app.css` only.
- **Svelte 5 runes only.** `$state`, `$derived`, `$props`. No Svelte 4 patterns.
- **Do not call `readDir` recursively beyond 2 levels deep.** Flatten anything deeper.

---

## Sub-agent breakdown

Orchestrate these three sub-agents in sequence:

**Sub-agent A — Data layer**
Write the `readDir` logic and the data normalisation function.
Input: a folder path string.
Output: a flat array of `FileEntry` objects, sorted (dirs first, then files, both alphabetical).

```ts
type FileEntry = {
  path: string       // full absolute path
  name: string       // display name (filename only)
  depth: number      // 0 = root, 1 = one level in
  isDir: boolean
}
```

Only include `.md` and `.markdown` files. Include directories that
contain at least one such file. Ignore hidden files and `node_modules`.

**Sub-agent B — Component structure**
Write the Svelte component using the data layer from Sub-agent A.
No logic — just rendering and event handling.

**Sub-agent C — Styles**
Write the scoped CSS block. Uses only CSS variables from `app.css`.
No hardcoded colours.

---

## Props contract

The next agent (Agent 2) will use this component exactly like this:

```svelte
<FileTree
  rootPath={folderPath}
  activeFile={filePath}
  onSelect={(path) => openFileFromTree(path)}
/>
```

Build to this contract. Do not change the prop names.

---

## Visual spec

```
notes/                    ← dir, depth 0, collapsed = ▶, expanded = ▼
  meeting-notes.md        ← file, depth 1, active = green left border
  todo.md                 ← file, depth 1
archive/                  ← dir, depth 0
  old-notes.md            ← file, depth 1 (hidden until archive/ expanded)
readme.md                 ← file, depth 0
```

- Row height: 28px
- Depth indent: 14px per level
- Active file: `2px solid var(--accent)` left border, `var(--accent-dim)` background
- Hover: `background: #242424`
- Font: `var(--font-ui)`, 11px
- Dir arrow colour: `var(--text-dim)`
- File name colour: `var(--text)` (active), `var(--text-dim)` (inactive)
- No scrollbar styling needed — inherit from global

---

## Acceptance criteria

- [ ] Component mounts and calls `readDir` on `rootPath`
- [ ] Only `.md` / `.markdown` files appear
- [ ] Directories collapse and expand on click
- [ ] Files deeper than 2 levels are shown at depth 2 (flattened)
- [ ] Clicking a file calls `onSelect(path)` with the full absolute path
- [ ] Active file (`activeFile` prop) is visually distinct
- [ ] Component cleans up properly on destroy
- [ ] No console errors on mount

---

## What NOT to do

- Do not implement file renaming
- Do not implement file creation
- Do not implement drag and drop
- Do not add a search/filter input
- Do not add right-click context menus
- Do not implement folder watching / live updates
- Do not touch App.svelte — that is Agent 2's job
