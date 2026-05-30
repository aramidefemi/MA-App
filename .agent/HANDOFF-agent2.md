# Handoff — Folder Support / Agent 2

## Completed

- Wired `src/lib/components/FileTree.svelte` into `src/App.svelte`.
- Added folder state:
  - `folderPath`
  - `showSidebar`
  - `hasSidebar`
- Added `openFolder()` using a directory picker.
- Added `openFileFromTree(path)` to save dirty content before loading the selected markdown file.
- Added keyboard shortcuts:
  - `⌘⇧O` / `Ctrl+Shift+O` opens the folder picker.
  - `⌘B` / `Ctrl+B` toggles the sidebar only after a folder is open.
- Added a `folder` button beside the existing `open` button in the topbar.
- Wrapped the existing editor block in `.workspace` and added a 200px `.sidebar`.

## Files Changed

- `src/App.svelte`
- `.agent/HANDOFF-agent2.md`
- `.agent/DECISIONS-folder-support-agent2.md`

## Agent 3 Permission Notes

The frontend now uses these Tauri APIs:

- `open({ directory: true, multiple: false })` from `@tauri-apps/plugin-dialog`
- `readTextFile(path)` from `@tauri-apps/plugin-fs`
- `readDir(path)` from `@tauri-apps/plugin-fs`, called inside `FileTree.svelte`

`readTextFile(path)` was already used by the app. Agent 3 should confirm the dialog permissions allow directory picking and add/confirm filesystem permissions for `readDir(path)`.

## Notes

- `FileTree.svelte` was already present when Agent 2 started.
- `.agent/HANDOFF-agent1.md` was requested by the task but was not present in `.agent/`.
- No Tauri files, `FileTree.svelte`, `Editor.svelte`, `OutlinePanel.svelte`, or `app.css` were changed.
