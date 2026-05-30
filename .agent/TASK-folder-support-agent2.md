# Task — Folder Support / Agent 2
## App.svelte layout integration

**Agent:** 2 of 3  
**Reads:** `BOOTSTRAP.md`, `HANDOFF-agent1.md`, `src/App.svelte`, `src/lib/components/FileTree.svelte`  
**Produces:** Updated `src/App.svelte`, `HANDOFF-agent2.md`, `DECISIONS-folder-support-agent2.md`  
**Must NOT touch:** `FileTree.svelte`, any Tauri files, `app.css`

---

## Your job

Wire `FileTree.svelte` into `App.svelte`. Add the sidebar layout,
the open-folder flow, and the keyboard shortcuts. Nothing else.

Do not rewrite `App.svelte`. Make surgical additions and the one
layout change needed to accommodate the sidebar. Every line you add
should be justifiable.

---

## Hard limits

- **Surgical edits only.** Read the current `App.svelte` first.
  Add the minimum code to make the sidebar work. Do not reorganise
  sections that aren't related to this task.
- **No new npm packages.**
- **Do not change the Editor component or its props.**
- **Do not change the OutlinePanel component or its props.**
- **Do not change any existing keyboard shortcuts** — only add new ones.
- **Sidebar width is hardcoded at 200px.** No resize handle. No CSS variable for it.
  If someone wants to change it later, they change the one number.
- **Svelte 5 runes only.**

---

## Sub-agent breakdown

**Sub-agent A — State additions**
Add only the new state variables to the `<script>` block.
Do not touch existing state. Do not touch existing functions.

New state:
```js
let folderPath  = $state(null)   // absolute path to open folder
let showSidebar = $state(false)  // sidebar visibility toggle
```

New derived:
```js
let hasSidebar = $derived(!!folderPath && showSidebar)
```

New function:
```js
async function openFolder() {
  const selected = await open({ directory: true, multiple: false })
  if (!selected) return
  folderPath  = selected
  showSidebar = true
}

async function openFileFromTree(path) {
  // if current file is dirty, prompt save first
  if (isDirty) await saveFile()
  const text = await readTextFile(path)
  filePath     = path
  content      = text
  savedContent = text
}
```

**Sub-agent B — Keyboard shortcuts**
Add to the existing `handleKeydown` function only. Touch nothing else.

```
⌘B        → showSidebar = !showSidebar  (only if folderPath is set)
⌘⇧O      → openFolder()
```

**Sub-agent C — Layout**
This is the one structural change. The editor area currently looks like:

```svelte
<div class="editor-wrap"> ... </div>
```

Wrap it with a `<div class="workspace">` that puts the sidebar and
editor side by side when `hasSidebar` is true:

```svelte
<div class="workspace">
  {#if hasSidebar}
    <aside class="sidebar">
      <FileTree
        rootPath={folderPath}
        activeFile={filePath}
        onSelect={openFileFromTree}
      />
    </aside>
  {/if}

  {#key filePath}
    <div class="editor-wrap">
      <Editor ... />
    </div>
  {/key}
</div>
```

CSS for workspace and sidebar:
```css
.workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 200px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  overflow-y: auto;
}
```

**Sub-agent D — Topbar button**
Add an "open folder" button to the topbar's right actions area.
Next to the existing "open" button. Text: `folder`. Same styling
as the existing `action` button class. Calls `openFolder()`.

---

## State shape for Agent 3

Agent 3 only touches Tauri files. But they need to know the JS calls
being made so permissions match. Document this clearly in your HANDOFF:

- `open({ directory: true })` from `@tauri-apps/plugin-dialog`
- `readTextFile(path)` from `@tauri-apps/plugin-fs` (already permitted)
- `readDir(path)` from `@tauri-apps/plugin-fs` (called inside FileTree — needs new permission)

---

## Acceptance criteria

- [ ] `⌘⇧O` opens a folder picker (directory mode)
- [ ] Selecting a folder shows the sidebar with the file tree
- [ ] `⌘B` toggles the sidebar (only when a folder is open)
- [ ] Clicking a file in the sidebar opens it in the editor
- [ ] If the current file is dirty when clicking a new file, save runs first
- [ ] Single file `⌘O` still works exactly as before
- [ ] Outline panel still works alongside the sidebar
- [ ] App layout doesn't jank when sidebar opens or closes
- [ ] `npm run tauri dev` runs clean with no console errors

---

## What NOT to do

- Do not add a sidebar header / toolbar inside the sidebar
- Do not add a "close folder" button (not needed yet)
- Do not animate the sidebar open/close (no transitions in V1)
- Do not change the topbar height
- Do not change OutlinePanel positioning
- Do not add word count or stats to the sidebar footer
