<script>
  import { ChevronRight, FileText, Folder, FolderOpen } from '@lucide/svelte'
  import { readDir } from '@tauri-apps/plugin-fs'
  import { displayFileName } from '../fileDisplay.js'
  import {
    buildFileTreeMenuItems,
    defsForWebMenu,
    popupNativeFileTreeContextMenu,
  } from '../fileTreeContextMenu.js'
  import { isTauri } from '../tauriEnv.js'
  import { isWriterSourceFile } from '../workspaceFileTypes.js'
  import {
    isDescendantOrSelf,
    joinPath,
    normalizePath,
    parentDir,
  } from '../pathUtils.js'
  import FileTreeContextMenu from './FileTreeContextMenu.svelte'

  /** @typedef {{ path: string, name: string, depth: number, isDir: boolean }} TreeEntry */

  let {
    rootPath = '',
    activeFile = '',
    filterQuery = '',
    canUndoDelete = false,
    onSelect,
    onMove = async () => {},
    onRename = async () => {},
    onDelete = async () => {},
    onDuplicate = async () => {},
    onReveal = async () => {},
    onNewFileIn = async () => {},
    onNewFolderIn = async () => {},
    onCopyPath = async () => {},
    onCopyFile = async () => {},
    onUndoDelete = async () => {},
  } = $props()

  let entries = $state([])
  let expanded = $state(new Set())
  let refreshToken = $state(0)
  let lastRootPath = ''
  let selectedPaths = $state(new Set())
  let selectionAnchor = $state('')
  let editingPath = $state('')
  let editingValue = $state('')
  let renameInput = $state(null)
  let draggingPath = $state('')
  let dropTargetPath = $state('')
  let dropOnRoot = $state(false)
  let contextMenu = $state({ open: false, x: 0, y: 0, entry: null })

  export function refresh() {
    refreshToken++
  }

  export function collapseAll() {
    expanded = new Set()
  }

  export function getSelectedPath() {
    return [...selectedPaths][0] ?? ''
  }

  /** @returns {TreeEntry | null} */
  export function getSelectedEntry() {
    const path = getSelectedPath()
    return entries.find((e) => e.path === path) ?? null
  }

  const normalizedFilter = $derived(filterQuery.trim().toLowerCase())

  const visibleEntries = $derived.by(() => {
    if (normalizedFilter) {
      return entries.filter((entry) => {
        const label = entry.isDir ? entry.name : displayFileName(entry.name)
        return label.toLowerCase().includes(normalizedFilter)
      })
    }

    const visible = []
    const open = []

    for (const entry of entries) {
      open.length = entry.depth
      if (entry.depth === 0 || open.every(Boolean)) visible.push(entry)
      if (entry.isDir) open[entry.depth] = expanded.has(entry.path)
    }

    return visible
  })

  const contextItems = $derived.by(() =>
    defsForWebMenu(buildFileTreeMenuItems(contextMenu.entry, canUndoDelete)),
  )

  $effect(() => {
    const path = rootPath
    const _refresh = refreshToken
    let cancelled = false

    if (path !== lastRootPath) {
      expanded = new Set()
      lastRootPath = path
      selectedPaths = new Set()
      selectionAnchor = ''
      closeContextMenu()
      cancelRename()
    }

    if (!path) {
      entries = []
      return
    }

    collectEntries(path, 0).then((next) => {
      if (!cancelled) entries = next
    })

    return () => {
      cancelled = true
    }
  })

  $effect(() => {
    if (!editingPath) return
    renameInput?.focus()
    renameInput?.select()
  })

  /** @param {string} folderPath @param {number} depth */
  async function collectEntries(folderPath, depth) {
    const dirs = []
    const files = []

    for (const entry of await safeReadDir(folderPath)) {
      if (shouldIgnore(entry.name)) continue

      const path = joinPath(folderPath, entry.name)
      if (entry.isDirectory) dirs.push({ path, name: entry.name, depth, isDir: true })
      if (entry.isFile && isWriterSourceFile(entry.name)) {
        files.push({ path, name: entry.name, depth, isDir: false })
      }
    }

    dirs.sort(sortByName)
    files.sort(sortByName)

    const result = []
    for (const dir of dirs) {
      const children = await collectEntries(dir.path, depth + 1)
      if (children.length) result.push(dir, ...children)
      else result.push(dir)
    }

    return [...result, ...files]
  }

  /** @param {string} path */
  async function safeReadDir(path) {
    try {
      return await readDir(path)
    } catch {
      return []
    }
  }

  /** @returns {TreeEntry[]} */
  function getSelectedEntries() {
    if (!selectedPaths.size) return []
    return entries.filter((e) => selectedPaths.has(e.path))
  }

  /** @param {TreeEntry} entry @param {MouseEvent} [e] */
  function selectRow(entry, e) {
    if (e?.shiftKey && selectionAnchor) {
      const anchorIdx = visibleEntries.findIndex((x) => x.path === selectionAnchor)
      const targetIdx = visibleEntries.findIndex((x) => x.path === entry.path)
      if (anchorIdx >= 0 && targetIdx >= 0) {
        const [from, to] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx]
        const next = new Set(selectedPaths)
        for (let i = from; i <= to; i++) next.add(visibleEntries[i].path)
        selectedPaths = next
        return
      }
    }

    if (e?.metaKey || e?.ctrlKey) {
      const next = new Set(selectedPaths)
      next.has(entry.path) ? next.delete(entry.path) : next.add(entry.path)
      selectedPaths = next
      selectionAnchor = entry.path
      return
    }

    selectedPaths = new Set([entry.path])
    selectionAnchor = entry.path
  }

  /** @param {TreeEntry} entry */
  function openFile(entry) {
    if (entry.isDir) return
    selectedPaths = new Set([entry.path])
    selectionAnchor = entry.path
    onSelect?.(entry.path)
  }

  /** @param {TreeEntry} entry */
  function toggleFolder(entry) {
    if (!entry.isDir) return
    const next = new Set(expanded)
    next.has(entry.path) ? next.delete(entry.path) : next.add(entry.path)
    expanded = next
  }

  /** @param {TreeEntry} entry @param {MouseEvent} [e] */
  function activateRow(entry, e) {
    if (e?.shiftKey || e?.metaKey || e?.ctrlKey) {
      selectRow(entry, e)
      return
    }
    selectRow(entry, e)
    if (entry.isDir) toggleFolder(entry)
    else openFile(entry)
  }

  /** @param {MouseEvent} e @param {TreeEntry | null} entry */
  async function openContextMenu(e, entry) {
    e.preventDefault()
    e.stopPropagation()
    if (entry && !selectedPaths.has(entry.path)) {
      selectedPaths = new Set([entry.path])
      selectionAnchor = entry.path
    }

    if (isTauri()) {
      contextMenu = { ...contextMenu, entry }
      await popupNativeFileTreeContextMenu(entry, canUndoDelete, handleMenuSelect)
      return
    }

    contextMenu = { open: true, x: e.clientX, y: e.clientY, entry }
  }

  function closeContextMenu() {
    contextMenu = { ...contextMenu, open: false }
  }

  /** @param {string} id */
  async function handleMenuSelect(id) {
    const entry = contextMenu.entry
    const targets = entry && selectedPaths.has(entry.path) ? getSelectedEntries() : entry ? [entry] : []

    switch (id) {
      case 'open':
        if (entry && !entry.isDir) openFile(entry)
        break
      case 'new-file':
        await onNewFileIn(entry?.isDir ? entry.path : rootPath)
        break
      case 'new-folder':
        await onNewFolderIn(entry?.isDir ? entry.path : rootPath)
        break
      case 'copy-path':
        if (targets.length) await onCopyPath(targets.map((t) => t.path))
        break
      case 'copy-file':
        if (entry && !entry.isDir) await onCopyFile(entry.path)
        break
      case 'rename':
        if (entry) startRename(entry)
        break
      case 'duplicate':
        if (entry && !entry.isDir) await onDuplicate(entry.path)
        break
      case 'reveal':
        if (entry) await onReveal(entry.path)
        break
      case 'delete':
        if (targets.length) await onDelete(targets)
        break
      case 'undo-delete':
        await onUndoDelete()
        break
    }
  }

  /** @param {TreeEntry} entry */
  function startRename(entry) {
    selectedPaths = new Set([entry.path])
    selectionAnchor = entry.path
    editingPath = entry.path
    editingValue = entry.isDir ? entry.name : displayFileName(entry.name)
  }

  function cancelRename() {
    editingPath = ''
    editingValue = ''
  }

  /** @param {TreeEntry} entry */
  async function commitRename(entry) {
    if (editingPath !== entry.path) return
    const next = editingValue.trim()
    cancelRename()
    if (!next || next === (entry.isDir ? entry.name : displayFileName(entry.name))) return
    await onRename(entry.path, next, entry)
  }

  /** @param {KeyboardEvent} e @param {TreeEntry} entry */
  function handleRenameKeydown(e, entry) {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      void commitRename(entry)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelRename()
    }
  }

  /** @param {KeyboardEvent} e @param {TreeEntry} entry */
  function handleRowKeydown(e, entry) {
    if (editingPath) return

    if (e.key === 'F2') {
      e.preventDefault()
      startRename(entry)
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      const targets = selectedPaths.has(entry.path) ? getSelectedEntries() : [entry]
      if (targets.length) void onDelete(targets)
    }
  }

  /** @param {DragEvent} e @param {TreeEntry} entry */
  function handleDragStart(e, entry) {
    if (!selectedPaths.has(entry.path)) {
      selectedPaths = new Set([entry.path])
      selectionAnchor = entry.path
    }
    draggingPath = entry.path
    e.dataTransfer?.setData('text/plain', entry.path)
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    draggingPath = ''
    dropTargetPath = ''
    dropOnRoot = false
  }

  /** @param {DragEvent} e */
  function handleRootDragOver(e) {
    const from = draggingPath || e.dataTransfer?.getData('text/plain') || ''
    if (!from || !rootPath || !canDropOn(from, rootPath)) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    dropOnRoot = true
    dropTargetPath = ''
  }

  /** @param {DragEvent} e */
  function handleRootDragLeave(e) {
    if (e.currentTarget === e.target) dropOnRoot = false
  }

  /** @param {string} destFolder */
  function moveSourcesForDrop(from, destFolder) {
    const sources = selectedPaths.has(from) ? [...selectedPaths] : [from]
    return sources.filter((p) => canDropOn(p, destFolder))
  }

  /** @param {DragEvent} e */
  async function handleRootDrop(e) {
    e.preventDefault()
    const from = draggingPath || e.dataTransfer?.getData('text/plain') || ''
    draggingPath = ''
    dropOnRoot = false
    dropTargetPath = ''
    if (!from || !rootPath) return
    for (const src of moveSourcesForDrop(from, rootPath)) await onMove(src, rootPath)
  }

  /** @param {DragEvent} e @param {TreeEntry} entry */
  function handleDragOver(e, entry) {
    dropOnRoot = false
    if (!entry.isDir || !draggingPath || !canDropOn(draggingPath, entry.path)) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    dropTargetPath = entry.path
  }

  /** @param {DragEvent} e @param {TreeEntry} entry */
  function handleDragLeave(e, entry) {
    if (dropTargetPath === entry.path) dropTargetPath = ''
  }

  /** @param {DragEvent} e @param {TreeEntry} entry */
  async function handleDrop(e, entry) {
    e.preventDefault()
    const from = draggingPath || e.dataTransfer?.getData('text/plain') || ''
    const to = entry.path
    draggingPath = ''
    dropTargetPath = ''
    dropOnRoot = false
    if (!from || !entry.isDir) return

    const next = new Set(expanded)
    next.add(to)
    expanded = next
    for (const src of moveSourcesForDrop(from, to)) await onMove(src, to)
  }

  /** @param {string} from @param {string} toFolder */
  function canDropOn(from, toFolder) {
    if (!from || !toFolder) return false
    if (normalizePath(from) === normalizePath(toFolder)) return false
    const parent = parentDir(from)
    return parent !== normalizePath(toFolder) && !isDescendantOrSelf(from, toFolder)
  }

  /** @param {string} name */
  function shouldIgnore(name) {
    return name.startsWith('.') || name === 'node_modules'
  }

  /** @param {TreeEntry} entry */
  function rowClass(entry) {
    const parts = ['row', entry.isDir ? 'dir' : 'file']
    if (!entry.isDir && entry.path === activeFile) parts.push('active')
    if (selectedPaths.has(entry.path)) parts.push('selected')
    if (contextMenu.open && contextMenu.entry?.path === entry.path) parts.push('context-selected')
    if (entry.isDir && entry.path === dropTargetPath) parts.push('drop-target')
    if (entry.path === draggingPath) parts.push('dragging')
    return parts.join(' ')
  }

  /** @param {TreeEntry} entry */
  function rowStyle(entry) {
    const pad = normalizedFilter ? 2 : 2 + entry.depth * 14
    return `padding-left:${pad}px`
  }

  /** @param {TreeEntry} entry */
  function isExpanded(entry) {
    return expanded.has(entry.path)
  }

  /** @param {{ name: string }} a @param {{ name: string }} b */
  const sortByName = (a, b) => a.name.localeCompare(b.name)
</script>

<div
  class="file-tree"
  class:root-drop={dropOnRoot}
  role="tree"
  tabindex="-1"
  aria-label="Workspace files"
  oncontextmenu={(e) => openContextMenu(e, null)}
  ondragover={handleRootDragOver}
  ondragleave={handleRootDragLeave}
  ondrop={handleRootDrop}
>
  {#each visibleEntries as entry (entry.path)}
    <div
      class={rowClass(entry)}
      style={rowStyle(entry)}
      role="treeitem"
      tabindex="0"
      aria-expanded={entry.isDir ? isExpanded(entry) : undefined}
      aria-selected={selectedPaths.has(entry.path) || (!entry.isDir && entry.path === activeFile)}
      draggable={true}
      onclick={(e) => activateRow(entry, e)}
      oncontextmenu={(e) => openContextMenu(e, entry)}
      onkeydown={(e) => handleRowKeydown(e, entry)}
      ondragstart={(e) => handleDragStart(e, entry)}
      ondragend={handleDragEnd}
      ondragover={(e) => handleDragOver(e, entry)}
      ondragleave={(e) => handleDragLeave(e, entry)}
      ondrop={(e) => handleDrop(e, entry)}
    >
      {#if entry.isDir}
        <span class="chevron" class:open={isExpanded(entry)} aria-hidden="true">
          <ChevronRight size={14} strokeWidth={1.75} />
        </span>
        <span class="entry-icon" aria-hidden="true">
          {#if isExpanded(entry)}
            <FolderOpen size={14} strokeWidth={1.5} />
          {:else}
            <Folder size={14} strokeWidth={1.5} />
          {/if}
        </span>
      {:else}
        <span class="chevron spacer" aria-hidden="true"></span>
        <span class="entry-icon" aria-hidden="true">
          <FileText size={14} strokeWidth={1.5} />
        </span>
      {/if}

      {#if editingPath === entry.path}
        <input
          bind:this={renameInput}
          class="rename-input"
          type="text"
          bind:value={editingValue}
          onclick={(e) => e.stopPropagation()}
          ondblclick={(e) => e.stopPropagation()}
          onkeydown={(e) => handleRenameKeydown(e, entry)}
          onblur={() => void commitRename(entry)}
        />
      {:else}
        <span class="name">{entry.isDir ? entry.name : displayFileName(entry.name)}</span>
      {/if}
    </div>
  {:else}
    <p class="empty-hint">
      {#if normalizedFilter}
        No files match “{filterQuery.trim()}”
      {:else}
        Empty folder — right-click to create files
      {/if}
    </p>
  {/each}
</div>

{#if !isTauri()}
  <FileTreeContextMenu
    open={contextMenu.open}
    x={contextMenu.x}
    y={contextMenu.y}
    items={contextItems}
    onSelect={handleMenuSelect}
    onClose={closeContextMenu}
  />
{/if}

<style>
  .file-tree {
    width: 100%;
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
    font-family: var(--font-ui);
    font-size: 13px;
  }

  .file-tree.root-drop {
    outline: 1px dashed var(--accent);
    outline-offset: -2px;
    background: color-mix(in srgb, var(--accent-dim) 35%, transparent);
  }

  .row {
    width: calc(100% - 4px);
    height: 28px;
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 0 4px 0 0;
    border: 0;
    border-left: 2px solid transparent;
    padding-right: 6px;
    background: transparent;
    color: var(--text-dim);
    font: inherit;
    text-align: left;
    border-radius: var(--radius);
    cursor: default;
    transition: background 0.12s, color 0.12s, opacity 0.12s;
    outline: none;
  }

  .row:hover {
    background: color-mix(in srgb, var(--surface) 92%, var(--text) 8%);
  }

  .row:focus-visible {
    outline: 1px solid var(--accent);
    outline-offset: -1px;
  }

  .row.selected,
  .row.context-selected {
    background: color-mix(in srgb, var(--surface) 88%, var(--text) 12%);
  }

  .row.dragging {
    opacity: 0.45;
  }

  .row.drop-target {
    background: color-mix(in srgb, var(--accent-dim) 65%, var(--surface));
    outline: 1px dashed var(--accent);
    outline-offset: -1px;
  }

  .chevron {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    flex: 0 0 14px;
    color: var(--text-dim);
    transition: transform 0.15s ease;
  }

  .chevron.open {
    transform: rotate(90deg);
  }

  .chevron.spacer {
    visibility: hidden;
  }

  .entry-icon {
    display: flex;
    align-items: center;
    flex: 0 0 14px;
    color: var(--text-dim);
  }

  .dir .entry-icon {
    color: var(--text);
  }

  .name {
    min-width: 0;
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .dir .name {
    color: var(--text);
  }

  .rename-input {
    min-width: 0;
    flex: 1;
    height: 22px;
    padding: 0 4px;
    border: 1px solid var(--accent);
    border-radius: calc(var(--radius) - 2px);
    background: var(--surface);
    color: var(--text);
    font: inherit;
    outline: none;
  }

  .file.active {
    border-radius: 0;
    border-left-color: var(--accent);
    background: var(--accent-dim);
  }

  .file.active .name {
    color: var(--text);
  }

  .file.active .entry-icon {
    color: var(--accent);
  }

  .empty-hint {
    margin: 12px 10px;
    font-size: 12px;
    color: var(--text-dim);
    text-align: center;
  }
</style>
