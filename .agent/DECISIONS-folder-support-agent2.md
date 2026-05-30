# Decisions — Folder Support / Agent 2

## Sidebar Layout

Kept the layout change scoped to the editor branch by wrapping the existing keyed editor block in a `.workspace` flex container. The sidebar is rendered only when `folderPath` exists and `showSidebar` is true.

## Sidebar Width

Hardcoded the sidebar width to `200px` as required. No resize state, CSS variable, or transition was added.

## Dirty File Handling

`openFileFromTree(path)` calls `saveFile()` before reading the selected file when `isDirty` is true. This keeps the folder tree selection flow aligned with the existing save implementation and avoids changing the editor contract.

## Shortcuts

Added only new shortcut branches inside `handleKeydown`:

- `⌘⇧O` / `Ctrl+Shift+O` for folder open.
- `⌘B` / `Ctrl+B` for sidebar toggle when a folder is open.

Existing shortcuts remain unchanged.
