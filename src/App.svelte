<script>
  import { onMount } from 'svelte'
  import { open, save } from '@tauri-apps/plugin-dialog'
  import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
  import { homeDir } from '@tauri-apps/api/path'
  import { getCurrentWindow } from '@tauri-apps/api/window'
  import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
  import { exportDocx, exportPdf, printDocument } from './lib/export.js'
  import { setupAppMenu } from './lib/appMenu.js'
  import Editor from './lib/components/Editor.svelte'
  import FileTree from './lib/components/FileTree.svelte'
  import OutlinePanel from './lib/components/OutlinePanel.svelte'
  import WelcomeScreen from './lib/components/WelcomeScreen.svelte'
  import DocumentMetaBar from './lib/components/DocumentMetaBar.svelte'
  import Settings from './lib/components/Settings.svelte'
  import SidebarToggle from './lib/components/SidebarToggle.svelte'
  import { app } from './lib/app.js'
  // import { addRecentProject, loadRecentProjects, projectName } from './lib/recentProjects.js'

  const UNTITLED_PATH = 'untitled.md'
  const isUntitled = (path) => path === UNTITLED_PATH

  // ─── State ────────────────────────────────────────────────────
  let filePath     = $state(null)
  let content      = $state('')
  let savedContent = $state('')
  let saveStatus   = $state('idle') // 'idle' | 'saving' | 'saved' | 'error'
  let showOutline  = $state(false)
  let folderPath   = $state(null)
  let showSidebar  = $state(false)
  let showSettings = $state(false)
  let topbarDismissed = $state(false)
  let topbarHovered   = $state(false)
  let skipTopbarHide  = $state(true)
  // let recentProjects  = $state([])
  let homePath        = $state('')

  // ─── Derived ──────────────────────────────────────────────────
  let showWelcome = $derived(!filePath && !folderPath)
  let topbarVisible = $derived(!topbarDismissed || topbarHovered)
  let isDirty  = $derived(content !== savedContent)
  let hasSidebar = $derived(!!folderPath && showSidebar)
  let fileName = $derived(
    filePath
      ? filePath.split('/').pop().split('\\').pop()
      : null
  )

  // ─── Recent projects (disabled) ─────────────────────────────
  $effect(() => {
    // loadRecentProjects().then((list) => (recentProjects = list))
    homeDir().then((dir) => (homePath = dir))
  })

  onMount(() => {
    setupAppMenu({
      newFile,
      newWindow,
      openFile,
      saveFile,
      saveAs,
      exportDocx: () => exportDocx(content, fileName),
      exportPdf: () => exportPdf(content, fileName),
      print: () => printDocument(fileName ?? 'Document'),
      closeTab,
      closeAll,
    })
  })

  function formatDisplayPath(path) {
    if (homePath && path.startsWith(homePath)) {
      return `~${path.slice(homePath.length)}`
    }
    return path
  }

  // async function rememberProject(type, path) {
  //   recentProjects = await addRecentProject({
  //     type,
  //     path,
  //     name: projectName(path),
  //   })
  // }

  async function loadFileAt(path) {
    const text = await readTextFile(path)
    filePath = path
    content = text
    savedContent = text
    showSettings = false
    resetTopbar()
    // await rememberProject('file', path)
  }

  async function loadFolderAt(path) {
    folderPath = path
    showSidebar = true
    // await rememberProject('folder', path)
  }

  // ─── File ops ─────────────────────────────────────────────────
  async function openFile() {
    const selected = await open({
      filters: [{
        name: app.fileDialog.filterName,
        extensions: app.fileDialog.extensions,
      }],
      multiple: false,
    })
    if (!selected) return
    await loadFileAt(selected)
  }

  async function openFolder() {
    const selected = await open({ directory: true, multiple: false })
    if (!selected) return
    await loadFolderAt(selected)
  }

  // async function openRecent(project) {
  //   if (project.type === 'folder') {
  //     await loadFolderAt(project.path)
  //     return
  //   }
  //   await loadFileAt(project.path)
  // }

  async function openFileFromTree(path) {
    if (isDirty) await saveFile()
    await loadFileAt(path)
  }

  async function saveFile() {
    if (!filePath || isUntitled(filePath)) {
      await saveAs()
      return
    }
    if (!isDirty) return
    saveStatus = 'saving'
    try {
      await writeTextFile(filePath, content)
      savedContent = content
      saveStatus = 'saved'
      setTimeout(() => (saveStatus = 'idle'), 1400)
    } catch (e) {
      saveStatus = 'error'
      console.error('Save failed:', e)
    }
  }

  async function saveAs() {
    const selected = await save({
      filters: [{
        name: app.fileDialog.filterName,
        extensions: app.fileDialog.extensions,
      }],
    })
    if (!selected) return
    saveStatus = 'saving'
    try {
      await writeTextFile(selected, content)
      filePath = selected
      savedContent = content
      showSettings = false
      resetTopbar()
      saveStatus = 'saved'
      setTimeout(() => (saveStatus = 'idle'), 1400)
      // await rememberProject('file', selected)
    } catch (e) {
      saveStatus = 'error'
      console.error('Save as failed:', e)
    }
  }

  function startWriting() {
    filePath = UNTITLED_PATH
    content = ''
    savedContent = ''
    showSettings = false
    resetTopbar()
  }

  function newFile() {
    if (isDirty && filePath) saveFile()
    startWriting()
  }

  async function newWindow() {
    const label = `window-${Date.now()}`
    new WebviewWindow(label, {
      url: '/',
      width: 1100,
      height: 760,
      minWidth: 600,
      minHeight: 400,
      titleBarStyle: 'Overlay',
      hiddenTitle: true,
      acceptFirstMouse: true,
    })
  }

  async function closeTab() {
    if (isDirty) await saveFile()
    filePath = null
    content = ''
    savedContent = ''
    showOutline = false
    showSettings = false
    resetTopbar()
  }

  async function closeAll() {
    if (isDirty) await saveFile()
    await getCurrentWindow().close()
  }

  // ─── Keyboard ─────────────────────────────────────────────────
  function handleKeydown(e) {
    const mod = e.metaKey || e.ctrlKey
    if (mod && e.key === 'n') {
      e.preventDefault()
      newFile()
    }
    if (mod && e.key === 's' && !e.shiftKey) {
      e.preventDefault()
      saveFile()
    }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'o') {
      e.preventDefault()
      openFolder()
    }
    if (mod && e.key === 'o' && !e.shiftKey) {
      e.preventDefault()
      openFile()
    }
    if (mod && e.key === 'p') {
      e.preventDefault()
      printDocument(fileName ?? 'Document')
    }
    if (mod && e.altKey && e.key.toLowerCase() === 'w') {
      e.preventDefault()
      closeAll()
    }
    if (mod && e.key === 'w' && !e.altKey) {
      e.preventDefault()
      closeTab()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'b' && folderPath) {
      e.preventDefault()
      showSidebar = !showSidebar
    }
    if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
      e.preventDefault()
      showOutline = !showOutline
    }
    if (e.key === 'Escape') {
      if (showSettings) showSettings = false
      else if (showOutline) showOutline = false
    }
  }

  function toggleSidebar() {
    if (folderPath) showSidebar = !showSidebar
  }

  // ─── Topbar distraction-free mode ─────────────────────────────
  function resetTopbar() {
    topbarDismissed = false
    topbarHovered = false
    skipTopbarHide = true
  }

  // ─── Content sync from editor ─────────────────────────────────
  function handleContentChange(markdown) {
    content = markdown
    if (skipTopbarHide) {
      skipTopbarHide = false
      return
    }
    topbarDismissed = true
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="app">

  <!-- ─── Welcome ─────────────────────────────────────── -->
  {#if showWelcome}
    <div class="titlebar-drag" data-tauri-drag-region></div>
    <div class="empty">
      <WelcomeScreen
        onStartWriting={startWriting}
        onOpenFile={openFile}
        onOpenFolder={openFolder}
      />
    </div>

  <!-- ─── Editor ──────────────────────────────────────── -->
  {:else}
    <div class="editor-shell">
      <div class="workspace">
        {#if hasSidebar}
          <aside class="sidebar">
            <div class="sidebar-titlebar" data-tauri-drag-region>
              <SidebarToggle
                onclick={toggleSidebar}
                title="Hide sidebar (⌘B)"
              />
            </div>
            <FileTree
              rootPath={folderPath}
              activeFile={filePath}
              onSelect={openFileFromTree}
            />
            <DocumentMetaBar
              {content}
              {fileName}
              onOpenSettings={() => (showSettings = true)}
            />
          </aside>
        {/if}

        <div class="content-column">
          <div
            class="topbar-reveal"
            class:expanded={topbarVisible}
            class:has-sidebar={hasSidebar}
            role="presentation"
            onmouseenter={() => (topbarHovered = true)}
            onmouseleave={() => (topbarHovered = false)}
          >
            <div class="topbar-hover-zone" data-tauri-drag-region></div>

            <header class="topbar" class:visible={topbarVisible}>
              <div class="topbar-drag" data-tauri-drag-region></div>

              <div class="topbar-inner">
                {#if !hasSidebar}
                  <div class="traffic-light-spacer"></div>
                {/if}

                {#if filePath}
                  <div class="tabs">
                    <div class="tab active">
                      <span class="tab-name">{fileName}</span>
                      {#if isDirty}<span class="tab-dot"></span>{/if}
                    </div>
                  </div>
                {/if}

                <div class="topbar-actions">
                  <span class="save-indicator" class:visible={saveStatus !== 'idle'}>
                    {#if saveStatus === 'saving'}saving…
                    {:else if saveStatus === 'saved'}saved
                    {:else if saveStatus === 'error'}error
                    {/if}
                  </span>
                </div>
              </div>
            </header>
          </div>

          {#if folderPath && !hasSidebar}
            <div class="sidebar-toggle-float">
              <SidebarToggle
                variant="float"
                onclick={toggleSidebar}
                title="Show sidebar (⌘B)"
              />
            </div>
          {/if}

          <button
            class="outline-float"
            class:active={showOutline}
            onclick={() => showOutline = !showOutline}
            title="Document outline (⌘\)"
            aria-label="Toggle outline"
          >
            <svg width="13" height="11" viewBox="0 0 13 11" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="13" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="2" y="4" width="9" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="4" y="8" width="6" height="1.5" rx="0.75" fill="currentColor"/>
            </svg>
          </button>

          <div class="editor-wrap">
            {#if filePath}
              {#key filePath}
                <Editor
                  initialContent={content}
                  onContentChange={handleContentChange}
                />
              {/key}
            {:else}
              <div class="folder-prompt">
                <p>Select a markdown file from the sidebar</p>
                <span class="folder-prompt-path">{formatDisplayPath(folderPath)}</span>
              </div>
            {/if}
            {#if showSettings}
              <div class="settings-overlay">
                <Settings onBack={() => (showSettings = false)} />
              </div>
            {/if}
          </div>
        </div>
      </div>

    <!-- outline panel -->
    {#if showOutline}
      <OutlinePanel
        {content}
        onClose={() => showOutline = false}
      />
    {/if}
    </div>
  {/if}

</div>

<style>
  /* ─── App shell ─────────────────────────────────────── */
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--bg);
  }

  /* drag region when no file is open */
  .titlebar-drag {
    height: 38px;
    flex-shrink: 0;
    -webkit-app-region: drag;
  }

  /* ─── Editor shell ──────────────────────────────────── */
  .editor-shell {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .content-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    min-width: 0;
    min-height: 0;
  }

  .topbar-reveal {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 10px;
    z-index: 10;
  }

  .topbar-reveal.expanded {
    height: 38px;
  }

  .topbar-hover-zone {
    position: absolute;
    inset: 0;
    height: 10px;
    -webkit-app-region: drag;
  }

  .topbar-reveal.expanded .topbar-hover-zone {
    display: none;
  }

  /* ─── Topbar ─────────────────────────────────────────── */
  .topbar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 38px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
    transition: transform 0.2s ease, opacity 0.2s ease;
  }

  .topbar.visible {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }

  /* full-width drag layer behind topbar content */
  .topbar-drag {
    position: absolute;
    inset: 0;
    z-index: 0;
    -webkit-app-region: drag;
  }

  .topbar-inner {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: stretch;
    height: 100%;
    pointer-events: none;
  }

  /* space for macOS traffic lights (red/yellow/green) */
  .traffic-light-spacer {
    width: 80px;
    flex-shrink: 0;
  }

  /* ─── Tab strip ──────────────────────────────────────── */
  .tabs {
    display: flex;
    align-items: stretch;
    flex: 1;
    min-width: 0;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 14px;
    font-size: 18px;
    font-family: var(--font-ui);
    color: var(--text-dim);
    border-right: 1px solid var(--border);
    cursor: default;
    position: relative;
    max-width: 200px;
    transition: background 0.1s;
  }

  .tab.active {
    background: var(--bg);
    color: var(--text);
    /* bottom line to indicate active tab */
    box-shadow: inset 0 -1px 0 0 var(--bg);
  }

  /* cancel the border-bottom of topbar under the active tab */
  .tab.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--bg);
  }

  .tab-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: 0.02em;
  }

  .tab-dot {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
    opacity: 0.9;
  }

  /* ─── Right actions ──────────────────────────────────── */
  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    margin-left: auto;
    pointer-events: auto;
  }

  .save-indicator {
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .save-indicator.visible { opacity: 1; }

  .outline-float {
    position: absolute;
    border: none;
    top: 45px;
    right: 12px;
    z-index: 15;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px 8px;
    background: var(--surface); 
    color: var(--text-dim);
    border-radius: var(--radius);
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    transition: color 0.15s, border-color 0.15s, background 0.15s, box-shadow 0.15s;
  }

  .outline-float:hover {
    color: var(--text);
    border-color: #333;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
  }

  .outline-float.active {
    color: var(--accent);
    border-color: rgba(74, 222, 128, 0.4);
    background: var(--accent-dim);
  }

  /* ─── Workspace ──────────────────────────────────────── */
  .workspace {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .sidebar {
    width: 200px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border-right: 1px solid var(--border);
    overflow: hidden;
  }

  .sidebar-titlebar {
    position: relative;
    height: 38px;
    flex-shrink: 0;
    -webkit-app-region: drag;
  }

  .sidebar-titlebar :global(.sidebar-toggle) {
    position: absolute;
    left: 78px;
    top: 50%;
    transform: translateY(-50%);
  }

  .sidebar-toggle-float {
    position: absolute;
    top: 40px;
    left: 10px;
    z-index: 15;
  }

  .sidebar :global(.file-tree) {
    flex: 1;
    min-height: 0;
  }

  /* ─── Editor wrapper ─────────────────────────────────── */
  .editor-wrap {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
    min-height: 0;
  }

  .settings-overlay {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    background: var(--bg);
  }

  /* ─── Empty state ─────────────────────────────────────── */
  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .folder-prompt {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--text-dim);
    font-family: var(--font-ui);
    font-size: 12px;
  }

  .folder-prompt-path {
    font-size: 10px;
    letter-spacing: 0.04em;
    opacity: 0.7;
  }
</style>
