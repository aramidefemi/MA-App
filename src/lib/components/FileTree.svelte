<script>
  import { readDir } from '@tauri-apps/plugin-fs'
  import { displayFileName } from '../fileDisplay.js'
  import { isWriterSourceFile } from '../workspaceFileTypes.js'

  let { rootPath = '', activeFile = '', onSelect } = $props()
  let entries = $state([])
  let expanded = $state(new Set())
  let refreshToken = $state(0)
  let lastRootPath = $state('')

  export function refresh() {
    refreshToken++
  }

  export function collapseAll() {
    expanded = new Set()
  }
  const visibleEntries = $derived.by(() => {
    const visible = []
    const open = []

    for (const entry of entries) {
      open.length = entry.depth
      if (entry.depth === 0 || open.every(Boolean)) visible.push(entry)
      if (entry.isDir) open[entry.depth] = expanded.has(entry.path)
    }

    return visible
  })

  $effect(() => {
    const path = rootPath
    const _refresh = refreshToken
    let cancelled = false

    if (path !== lastRootPath) {
      expanded = new Set()
      lastRootPath = path
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
      if (depth >= 2) continue

      const children = await collectEntries(dir.path, depth + 1)
      if (children.length) result.push(dir, ...children)
    }

    return [...result, ...files]
  }

  async function safeReadDir(path) {
    try {
      return await readDir(path)
    } catch {
      return []
    }
  }

  function select(entry) {
    if (!entry.isDir) return onSelect?.(entry.path)

    const next = new Set(expanded)
    next.has(entry.path) ? next.delete(entry.path) : next.add(entry.path)
    expanded = next
  }

  function shouldIgnore(name) {
    return name.startsWith('.') || name === 'node_modules'
  }

  function joinPath(parent, name) {
    const separator = parent.includes('\\') && !parent.includes('/') ? '\\' : '/'
    return parent.endsWith('/') || parent.endsWith('\\')
      ? `${parent}${name}`
      : `${parent}${separator}${name}`
  }

  function rowClass(entry) {
    const active = !entry.isDir && entry.path === activeFile ? ' active' : ''
    return `row ${entry.isDir ? 'dir' : 'file'} depth-${entry.depth}${active}`
  }

  const sortByName = (a, b) => a.name.localeCompare(b.name)
</script>

<div class="file-tree" role="tree" aria-label="Workspace files">
  {#each visibleEntries as entry (entry.path)}
    <button
      type="button"
      class={rowClass(entry)}
      role="treeitem"
      aria-expanded={entry.isDir ? expanded.has(entry.path) : undefined}
      aria-selected={!entry.isDir && entry.path === activeFile}
      onclick={() => select(entry)}
    >
      {#if entry.isDir}
        <span class="arrow" aria-hidden="true">{expanded.has(entry.path) ? '▼' : '▶'}</span>
        <span class="name">{entry.name}/</span>
      {:else}
        <span class="name">{displayFileName(entry.name)}</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .file-tree {
    width: 100%;
    min-height: 0;
    overflow-y: auto;
    font-family: var(--font-ui);
    font-size: 11px;
  }

  .row {
    width: 100%;
    height: 28px;
    display: flex;
    align-items: center;
    gap: 6px;
    border: 0;
    border-left: 2px solid transparent;
    padding: 0 8px;
    background: transparent;
    color: var(--text-dim);
    font: inherit;
    text-align: left;
    cursor: default;
  }

  .row:hover { background: color-mix(in srgb, var(--surface) 92%, var(--text) 8%); }
  .row:focus-visible { outline: 1px solid var(--accent); outline-offset: -1px; }
  .depth-0 { padding-left: 6px; }
  .depth-1 { padding-left: 20px; }
  .depth-2 { padding-left: 34px; }
  .arrow { width: 10px; flex: 0 0 10px; color: var(--text-dim); }
  .name { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .dir .name { color: var(--text); }
  .file.active { border-left-color: var(--accent); background: var(--accent-dim); }
  .file.active .name { color: var(--text); }
</style>
