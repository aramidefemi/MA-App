<script>
  import { ListTree } from '@lucide/svelte'
  import { onMount } from 'svelte'
  import { getCurrentWindow } from '@tauri-apps/api/window'
  import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
  import { exportDocx, exportPdf, printDocument } from './lib/export.js'
  import { setupAppMenu } from './lib/appMenu.js'
  import { getEditorCommands } from './lib/editor/editorCommands.js'
  import Editor from './lib/components/Editor.svelte'
  import DocumentPreview from './lib/components/DocumentPreview.svelte'
  import FileTree from './lib/components/FileTree.svelte'
  import SidebarFileToolbar from './lib/components/SidebarFileToolbar.svelte'
  import { displayFileName } from './lib/fileDisplay.js'
  import { createFolderInWorkspace, createMarkdownInFolder } from './lib/workspaceFiles.js'
  import OutlinePanel from './lib/components/OutlinePanel.svelte'
  import WelcomeScreen from './lib/components/WelcomeScreen.svelte'
  import DocumentMetaBar from './lib/components/DocumentMetaBar.svelte'
  import SettingsPanel from './lib/components/SettingsPanel.svelte'
  import { settings } from './lib/modules/settings'
  import SidebarToggle from './lib/components/SidebarToggle.svelte'
  import ResearchPanel from './lib/components/ResearchPanel.svelte'
  import { research } from './lib/modules/research'
  import { ui } from './lib/modules/ui'
  import { workspace } from './lib/modules/workspace'
  import { aiLog } from './lib/debug/aiFlowLog.js'
  import { initUsageTracking } from './lib/modules/usage'
  import { session, persistSession } from './lib/modules/session'
  import { createAutosave } from './lib/autosave.js'
  import { document, isUntitled } from './lib/modules/document'
  import { wordGoal } from './lib/modules/wordGoal'
  import WordGoalBar from './lib/components/WordGoalBar.svelte'
  import EditorTopbar from './lib/components/EditorTopbar.svelte'
  // import { addRecentProject, loadRecentProjects, projectName } from './lib/recentProjects.js'

  // ─── State ────────────────────────────────────────────────────
  let filePath     = $state(null)
  let isPreview    = $state(false)
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
  let showResearch    = $state(false)
  let researchSessionId = $state(0)
  // let recentProjects  = $state([])
  let homePath        = $state('')
  let fileTree        = $state(null)

  $effect(() => {
    topbarDismissed = ui.topbarDismissed
    topbarHovered = ui.topbarHovered
    skipTopbarHide = ui.skipTopbarHide
    homePath = ui.homePath
  })

  $effect(() => {
    showResearch = research.showResearch
    researchSessionId = research.sessionId
  })

  $effect(() => {
    aiLog('App research state changed', {
      showResearch,
      researchSessionId,
      researchInputLen: research.researchInput.length,
      researchInputPreview: research.researchInput.slice(0, 80),
      filePath,
      showWelcome,
    })
  })
  let showWelcome = $derived(!filePath && !folderPath)
  let topbarVisible = $derived(!topbarDismissed || topbarHovered)
  let isDirty  = $derived(content !== savedContent)
  let hasSidebar = $derived(!!folderPath && showSidebar)
  let fileName = $derived(
    filePath
      ? displayFileName(filePath.split('/').pop().split('\\').pop())
      : null
  )

  $effect(() => {
    filePath = document.filePath
    isPreview = document.isPreview
    content = document.content
    savedContent = document.savedContent
    saveStatus = document.saveStatus
  })

  $effect(() => {
    folderPath = workspace.folderPath
    showSidebar = workspace.showSidebar
    showOutline = workspace.showOutline
    showSettings = workspace.showSettings
  })

  $effect(() => {
    document.filePath
    workspace.folderPath
    workspace.showSidebar
    workspace.showOutline
    research.showResearch
    session.scrollTop
    session.typewriterScroll
    session.focusMode
    persistSession()
  })

  let lastPersistedFilePath = $state(undefined)
  $effect(() => {
    const path = document.filePath
    if (!session.ready) return
    if (lastPersistedFilePath === undefined) {
      lastPersistedFilePath = path
      return
    }
    if (path !== lastPersistedFilePath) {
      lastPersistedFilePath = path
      session.setScrollTop(0)
      wordGoal.reset()
    }
  })

  onMount(() => {
    if (getCurrentWindow().label !== 'main') return
    return initUsageTracking()
  })

  const autosave = createAutosave(() => {
    if (!filePath || isUntitled(filePath) || !isDirty || isPreview) return
    void document.saveFile()
  })

  $effect(() => {
    filePath
    autosave.cancel()
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
      undo: () => getEditorCommands()?.undo(),
      redo: () => getEditorCommands()?.redo(),
    })
  })

  // async function rememberProject(type, path) {
  //   recentProjects = await addRecentProject({
  //     type,
  //     path,
  //     name: projectName(path),
  //   })
  // }

  async function loadFileAt(path) {
    await document.loadFileAt(path)
    workspace.closeSettings()
    resetTopbar()
    // await rememberProject('file', path)
  }

  async function loadFolderAt(path) {
    await workspace.loadFolderAt(path)
    // await rememberProject('folder', path)
  }

  // ─── File ops ─────────────────────────────────────────────────
  async function openFile() {
    await document.openFile()
    workspace.closeSettings()
    resetTopbar()
  }

  async function openFolder() {
    await workspace.openFolder()
  }

  // async function openRecent(project) {
  //   if (project.type === 'folder') {
  //     await loadFolderAt(project.path)
  //     return
  //   }
  //   await loadFileAt(project.path)
  // }

  async function openFileFromTree(path) {
    await document.openFileFromTree(path)
    workspace.closeSettings()
    resetTopbar()
  }

  async function saveFile() {
    autosave.cancel()
    await document.saveFile()
  }

  async function saveAs() {
    await document.saveAs()
    workspace.closeSettings()
    resetTopbar()
  }

  function startWriting() {
    document.startWriting()
    workspace.closeSettings()
    resetTopbar()
  }

  function newFile() {
    document.newFile()
    workspace.closeSettings()
    resetTopbar()
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
    await document.closeTab()
    workspace.closeOutline()
    workspace.closeSettings()
    resetTopbar()
  }

  async function closeAll() {
    if (isDirty) await saveFile()
    await getCurrentWindow().close()
  }

  // ─── Keyboard ─────────────────────────────────────────────────
  /** @param {KeyboardEvent} e */
  function isEditorTarget(e) {
    const t = e.target
    if (!(t instanceof Element)) return false
    return !!(t.closest('.editor-root') || t.closest('.ProseMirror'))
  }

  function handleKeydown(e) {
    const mod = e.metaKey || e.ctrlKey
    const inEditor = isEditorTarget(e)
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
    if (
      (e.metaKey || e.ctrlKey) &&
      e.shiftKey &&
      e.key.toLowerCase() === 'b' &&
      folderPath &&
      !inEditor
    ) {
      e.preventDefault()
      workspace.toggleSidebar()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === '\\' && !inEditor) {
      e.preventDefault()
      workspace.toggleOutline()
    }
    if (mod && e.shiftKey && e.key.toLowerCase() === 't') {
      e.preventDefault()
      session.toggleTypewriterScroll()
      persistSession()
    }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault()
      session.toggleFocusMode()
      persistSession()
    }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault()
      settings.toggleTheme()
    }
    if (mod && e.key === ',') {
      e.preventDefault()
      if (showSettings) workspace.closeSettings()
      else workspace.openSettings()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault()
      // ⌘E — explain selected text (Agent 3b wires the actual call)
    }
    if (e.key === 'Escape') {
      if (showSettings) workspace.closeSettings()
      else if (showOutline) workspace.closeOutline()
    }
  }

  function toggleSidebar() {
    workspace.toggleSidebar()
  }

  async function createWorkspaceFile() {
    if (!folderPath) return
    try {
      const path = await createMarkdownInFolder(folderPath)
      fileTree?.refresh()
      await openFileFromTree(path)
    } catch (e) {
      console.error('New file failed:', e)
    }
  }

  async function createWorkspaceFolder() {
    if (!folderPath) return
    try {
      await createFolderInWorkspace(folderPath)
      fileTree?.refresh()
    } catch (e) {
      console.error('New folder failed:', e)
    }
  }

  function refreshFileTree() {
    fileTree?.refresh()
  }

  function collapseFileTree() {
    fileTree?.collapseAll()
  }

  // ─── Topbar distraction-free mode ─────────────────────────────
  function resetTopbar() {
    ui.resetTopbar()
  }

  function openResearchWithText(text) {
    research.openWithText(text)
  }

  // ─── Content sync from editor ─────────────────────────────────
  function handleContentChange(_markdown) {
    ui.handleTopbarOnEdit()
    autosave.schedule()
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="app">
  <WordGoalBar />
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
                title="Hide sidebar (⌘⇧B)"
              />
            </div>
            <SidebarFileToolbar
              onNewFile={createWorkspaceFile}
              onNewFolder={createWorkspaceFolder}
              onRefresh={refreshFileTree}
              onCollapse={collapseFileTree}
            />
            <FileTree
              bind:this={fileTree}
              rootPath={folderPath}
              activeFile={filePath}
              onSelect={openFileFromTree}
            />
            <DocumentMetaBar />
          </aside>
        {/if}

        <div class="content-column">
          <div
            class="topbar-reveal"
            class:expanded={topbarVisible}
            class:has-sidebar={hasSidebar}
            role="presentation"
            onmouseenter={() => (ui.topbarHovered = true)}
            onmouseleave={() => (ui.topbarHovered = false)}
          >
            <div class="topbar-hover-zone" data-tauri-drag-region></div>

            <EditorTopbar
              fileName={fileName}
              isDirty={isDirty}
              topbarVisible={topbarVisible}
              hasSidebar={hasSidebar}
              saveStatus={saveStatus}
              onOpenSettings={() => workspace.openSettings()}
            />
          </div>

          {#if folderPath && !hasSidebar}
            <div class="sidebar-toggle-float">
              <SidebarToggle
                variant="float"
                onclick={toggleSidebar}
                title="Show sidebar (⌘⇧B)"
              />
            </div>
          {/if}
 
          <div class="editor-wrap">
            {#if filePath}
              {#key filePath}
                {#if isPreview}
                  <DocumentPreview path={filePath} />
                {:else}
                  <Editor
                    onContentChange={handleContentChange}
                    onAiClick={openResearchWithText}
                  />
                {/if}
              {/key}
            {:else}
              <div class="folder-prompt">
                <p>Select a file from the sidebar</p>
                <span class="folder-prompt-path">{ui.formatDisplayPath(folderPath)}</span>
              </div>
            {/if}
          </div>
        </div>

        {#if showResearch}
          {#key researchSessionId}
            <ResearchPanel />
          {/key}
        {/if}
      </div>

    <!-- outline panel -->
    {#if showOutline}
      <OutlinePanel />
    {/if}
    </div>
  {/if}

  {#if showSettings}
    <SettingsPanel onClose={() => workspace.closeSettings()} />
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
    overflow: visible;
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
