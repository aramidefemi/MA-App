<script>
  import { ListTree } from '@lucide/svelte'
  import { onMount } from 'svelte'
  import { getCurrentWindow } from '@tauri-apps/api/window'
  import { isTauri } from './lib/tauriEnv.js'
  import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
  import { exportDocx, exportPdf, printDocument } from './lib/export.js'
  import { setupAppMenu, refreshRecentMenu, syncMenuItemState } from './lib/appMenu.js'
  import { revealItemInDir } from '@tauri-apps/plugin-opener'
  import { exists } from '@tauri-apps/plugin-fs'
  import { getEditorCommands } from './lib/editor/editorCommands.js'
  import Editor from './lib/components/Editor.svelte'
  import DocumentPreview from './lib/components/DocumentPreview.svelte'
  import FileTree from './lib/components/FileTree.svelte'
  import SidebarFileToolbar from './lib/components/SidebarFileToolbar.svelte'
  import { displayFileName } from './lib/fileDisplay.js'
  import { save } from '@tauri-apps/plugin-dialog'
  import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
  import { dirname } from '@tauri-apps/api/path'
  import {
    createFolderInWorkspace,
    createMarkdownInFolder,
    duplicateFilePath,
    formatAiNoteContent,
    moveEntryToFolder,
    renameEntry,
    saveAiNoteInFolder,
    slugifyNoteName,
  } from './lib/workspaceFiles.js'
  import { copyText } from './lib/clipboard.js'
  import { confirmAction } from './lib/nativeDialog.js'
  import { hasTrashedItems, restoreFromTrash, trashEntry } from './lib/workspaceTrash.js'
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
  import { aiDrift } from './lib/modules/aiDrift'
  import { wordGoal } from './lib/modules/wordGoal'
  import WordGoalBar from './lib/components/WordGoalBar.svelte'
  import EditorTopbar from './lib/components/EditorTopbar.svelte'
  import FindBar from './lib/components/FindBar.svelte'
  import { addRecentProject, loadRecentProjects, projectName } from './lib/recentProjects.js'

  // ─── State ────────────────────────────────────────────────────
  let recentProjects = $state([])
  let showFind = $state(false)
  let fileTree = $state(null)
  let fileTreeSearch = $state('')
  let canUndoTrash = $state(false)
  let driftContentVersion = $state(0)

  let showWelcome = $derived(!document.filePath && !workspace.folderPath)
  let topbarVisible = $derived(ui.topbarVisible)
  let hasSidebar = $derived(
    !!workspace.folderPath && workspace.showSidebar && ui.sidebarChromeVisible,
  )
  let fileName = $derived(
    document.fileName ? displayFileName(document.fileName) : null,
  )
  let folderName = $derived(
    workspace.folderPath
      ? workspace.folderPath.split('/').pop()?.split('\\').pop() ?? null
      : null,
  )
  let driftLastManualCheck = $derived(aiDrift.lastManualCheck)
  let driftIsRunning = $derived(aiDrift.isRunning)
  let driftLastError = $derived(aiDrift.lastError)
  let driftMatchesCurrentFile = $derived(
    driftLastManualCheck?.filePath === document.filePath,
  )
  let driftDraftCount = $derived(
    driftMatchesCurrentFile
      ? (driftLastManualCheck?.result?.metadata?.issueCount ?? null)
      : null,
  )
  let driftIsPartial = $derived(
    driftMatchesCurrentFile && !!driftLastManualCheck?.result?.metadata?.partial,
  )
  let driftIsStale = $derived(
    driftMatchesCurrentFile && !!driftLastManualCheck?.stale,
  )
  let driftStatus = $derived.by(() => {
    if (driftIsRunning) return 'checking'
    if (driftLastError && driftMatchesCurrentFile) return 'error'
    if (!driftLastManualCheck || !driftMatchesCurrentFile) return 'idle'
    return 'done'
  })
  let driftStatusText = $derived.by(() => {
    if (driftStatus === 'checking') return 'Checking AI Draft...'
    if (driftStatus === 'error') return 'Error'
    if (driftStatus === 'done') {
      const count = driftDraftCount ?? 0
      const partialSuffix = driftIsPartial ? ' (partial)' : ''
      return `${count} drifty passage${count === 1 ? '' : 's'}${partialSuffix}`
    }
    return ''
  })

  let lastDriftFilePath = $state(null)
  $effect(() => {
    const path = document.filePath
    const isPreview = document.isPreview
    const isFirstRun = lastDriftFilePath === null
    const pathChanged = !isFirstRun && path !== lastDriftFilePath

    if (isFirstRun || pathChanged) {
      lastDriftFilePath = path
      if (!isFirstRun) driftContentVersion += 1
      if (path && !isPreview) runAiDriftCheck()
    }
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

  $effect(() => {
    void syncMenuItemState({
      canReveal: !!(revealTargetPath()),
      canDuplicate: !!(
        document.filePath &&
        !isUntitled(document.filePath) &&
        !document.isPreview
      ),
      canNewFileInFolder: !!workspace.folderPath,
      canCloseFolder: !!workspace.folderPath,
    })
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
    if (!isTauri() || getCurrentWindow().label !== 'main') return
    return initUsageTracking()
  })

  const autosave = createAutosave(() => {
    if (
      !document.filePath ||
      isUntitled(document.filePath) ||
      !document.isDirty ||
      document.isPreview
    ) {
      return
    }
    void document.saveFile()
  })

  $effect(() => {
    document.filePath
    autosave.cancel()
  })

  onMount(() => {
    void (async () => {
      recentProjects = await loadRecentProjects()
      await refreshRecentMenu(recentProjects)
      await setupAppMenu({
        newFile,
        newWindow,
        openFile,
        openFolder,
        openRecent,
        revealInFileManager,
        duplicateFile,
        newFileInFolder: createWorkspaceFile,
        closeFolder,
        saveFile,
        saveAs,
        exportDocx: () => exportDocx(document.content, fileName),
        exportPdf: () => exportPdf(document.content, fileName),
        print: () => printDocument(fileName ?? 'Document'),
        closeTab,
        closeAll,
        toggleSidebar,
        toggleOutline: () => workspace.toggleOutline(),
        toggleFocusMode: () => {
          session.toggleFocusMode()
          persistSession()
        },
        toggleTypewriterScroll: () => {
          session.toggleTypewriterScroll()
          persistSession()
        },
        toggleTheme: () => settings.toggleTheme(),
        toggleSettings: () => {
          if (workspace.showSettings) workspace.closeSettings()
          else workspace.openSettings()
        },
        openFind: () => {
          showFind = true
        },
        undo: () => getEditorCommands()?.undo(),
        redo: () => getEditorCommands()?.redo(),
      })
    })()
  })

  async function rememberProject(type, path) {
    recentProjects = await addRecentProject({
      type,
      path,
      name: projectName(path),
    })
    await refreshRecentMenu(recentProjects)
  }

  function revealTargetPath() {
    if (document.filePath && !isUntitled(document.filePath)) return document.filePath
    return workspace.folderPath
  }

  async function revealInFileManager() {
    const path = revealTargetPath()
    if (!path) return
    await revealItemInDir(path)
  }

  async function duplicateFile() {
    await document.duplicateFile()
    const path = document.filePath
    if (path && !isUntitled(path)) await rememberProject('file', path)
    fileTree?.refresh()
  }

  function closeFolder() {
    workspace.closeFolder()
    ui.resetSidebar()
  }

  async function loadFileAt(path) {
    await document.loadFileAt(path)
    workspace.closeSettings()
    resetTopbar()
    await rememberProject('file', path)
  }

  async function loadFolderAt(path) {
    await workspace.loadFolderAt(path)
    ui.resetSidebar()
    await rememberProject('folder', path)
    await refreshTrashState()
  }

  // ─── File ops ─────────────────────────────────────────────────
  async function openFile() {
    await document.openFile()
    workspace.closeSettings()
    resetTopbar()
    const path = document.filePath
    if (path && !isUntitled(path)) await rememberProject('file', path)
  }

  async function openFolder() {
    await workspace.openFolder()
    if (workspace.folderPath) {
      ui.resetSidebar()
      await rememberProject('folder', workspace.folderPath)
      await refreshTrashState()
    }
  }

  async function openRecent(project) {
    if (!(await exists(project.path))) return
    if (project.type === 'folder') {
      await loadFolderAt(project.path)
      return
    }
    await loadFileAt(project.path)
  }

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
    if (document.isDirty) await saveFile()
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
      workspace.folderPath &&
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
      if (workspace.showSettings) workspace.closeSettings()
      else workspace.openSettings()
    }
    if (mod && e.key === 'f' && !e.shiftKey) {
      e.preventDefault()
      if (document.filePath && !document.isPreview) showFind = true
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault()
      // ⌘E — explain selected text (Agent 3b wires the actual call)
    }
    if (e.key === 'Escape') {
      if (showFind) showFind = false
      else if (workspace.showSettings) workspace.closeSettings()
      else if (workspace.showOutline) workspace.closeOutline()
    }
  }

  function toggleSidebar() {
    workspace.toggleSidebar()
    if (workspace.showSidebar) ui.resetSidebar()
  }

  async function createWorkspaceFile() {
    await createFileInFolder(workspace.folderPath)
  }

  async function createWorkspaceFolder() {
    await createFolderIn(workspace.folderPath)
  }

  async function refreshTrashState() {
    const root = workspace.folderPath
    canUndoTrash = root ? await hasTrashedItems(root) : false
  }

  function refreshFileTree() {
    fileTree?.refresh()
    void refreshTrashState()
  }

  function collapseFileTree() {
    fileTree?.collapseAll()
  }

  /** @param {string} newName @param {string} diskName */
  function resolveRenameName(newName, diskName, isDir) {
    if (isDir) return newName.trim()
    const trimmed = newName.trim()
    if (!trimmed) return trimmed
    if (trimmed.includes('.')) return trimmed
    const dot = diskName.lastIndexOf('.')
    return dot > 0 ? `${trimmed}${diskName.slice(dot)}` : `${trimmed}.md`
  }

  async function createFileInFolder(folderPath) {
    if (!folderPath) return
    try {
      const path = await createMarkdownInFolder(folderPath)
      fileTree?.refresh()
      await openFileFromTree(path)
    } catch (e) {
      console.error('New file in folder failed:', e)
    }
  }

  async function createFolderIn(folderPath) {
    if (!folderPath) return
    try {
      await createFolderInWorkspace(folderPath)
      fileTree?.refresh()
    } catch (e) {
      console.error('New folder failed:', e)
    }
  }

  /** @param {string} fromPath @param {string} toFolderPath */
  async function handleTreeMove(fromPath, toFolderPath) {
    const root = workspace.folderPath
    if (!root) return
    try {
      const newPath = await moveEntryToFolder(fromPath, toFolderPath, root)
      document.retargetFilePath(fromPath, newPath)
      fileTree?.refresh()
    } catch (e) {
      console.error('Move failed:', e)
    }
  }

  /**
   * @param {string} path
   * @param {string} newName
   * @param {{ path: string, name: string, isDir: boolean }} entry
   */
  async function handleTreeRename(path, newName, entry) {
    const root = workspace.folderPath
    if (!root) return
    const finalName = resolveRenameName(newName, entry.name, entry.isDir)
    try {
      const newPath = await renameEntry(path, finalName, root, { isDir: entry.isDir })
      document.retargetFilePath(path, newPath)
      fileTree?.refresh()
    } catch (e) {
      console.error('Rename failed:', e)
    }
  }

  /**
   * @param {Array<{ path: string, name: string, isDir: boolean }>} targets
   */
  async function handleTreeDelete(targets) {
    const root = workspace.folderPath
    if (!root || !targets.length) return

    const label =
      targets.length === 1
        ? targets[0].isDir
          ? `folder “${targets[0].name}”`
          : `“${displayFileName(targets[0].name)}”`
        : `${targets.length} items`

    if (
      !(await confirmAction(`Move ${label} to Trash? You can undo from the sidebar menu.`, {
        title: 'Move to Trash',
      }))
    ) {
      return
    }

    try {
      for (const entry of targets) {
        await trashEntry(entry.path, root, { isDir: entry.isDir })
        document.clearIfRemoved(entry.path)
      }
      fileTree?.refresh()
      await refreshTrashState()
    } catch (e) {
      console.error('Delete failed:', e)
    }
  }

  /** @param {string[]} paths */
  async function handleTreeCopyPath(paths) {
    try {
      await copyText(paths.join('\n'))
    } catch (e) {
      console.error('Copy path failed:', e)
    }
  }

  /** @param {string} path */
  async function handleTreeCopyFile(path) {
    try {
      const text = await readTextFile(path)
      await copyText(text)
    } catch (e) {
      console.error('Copy file failed:', e)
    }
  }

  async function handleUndoDelete() {
    const root = workspace.folderPath
    if (!root) return
    try {
      const { restoredPath, isDir } = await restoreFromTrash(root)
      fileTree?.refresh()
      await refreshTrashState()
      if (!isDir) await openFileFromTree(restoredPath)
    } catch (e) {
      console.error('Undo delete failed:', e)
    }
  }

  /** @param {string} path */
  async function handleTreeDuplicate(path) {
    try {
      const newPath = await duplicateFilePath(path)
      const text = await readTextFile(path)
      await writeTextFile(newPath, text)
      fileTree?.refresh()
      await openFileFromTree(newPath)
    } catch (e) {
      console.error('Duplicate failed:', e)
    }
  }

  /** @param {string} path */
  async function handleTreeReveal(path) {
    await revealItemInDir(path)
  }

  function runAiDriftCheck() {
    if (!document.filePath || document.isPreview) return
    void aiDrift.runAiDriftManualCheck({
      filePath: document.filePath,
      content: document.content,
      contentVersion: driftContentVersion,
      getLatestContentVersion: () => driftContentVersion,
    })
  }

  // ─── Topbar distraction-free mode ─────────────────────────────
  function resetTopbar() {
    ui.resetTopbar()
  }

  function openResearchWithText(text) {
    research.openWithText(text)
  }

  async function resolveNoteDir() {
    if (workspace.folderPath) return workspace.folderPath
    if (document.filePath && !isUntitled(document.filePath)) {
      return dirname(document.filePath)
    }
    return null
  }

  async function handleSaveNote(context, response) {
    try {
      const dir = await resolveNoteDir()
      if (dir) {
        const path = await saveAiNoteInFolder(dir, context, response)
        if (workspace.folderPath) fileTree?.refresh()
        aiLog('handleSaveNote saved', { path })
        return
      }
      const selected = await save({
        defaultPath: `${slugifyNoteName(context)}.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      })
      if (!selected) return
      await writeTextFile(selected, formatAiNoteContent(context, response))
      aiLog('handleSaveNote saved via dialog', { path: selected })
    } catch (e) {
      console.error('Save note failed:', e)
    }
  }

  // ─── Content sync from editor ─────────────────────────────────
  function handleContentChange(_markdown) {
    driftContentVersion += 1
    ui.handleTopbarOnEdit()
    ui.handleSidebarOnEdit()
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
        {recentProjects}
        onStartWriting={startWriting}
        onOpenFile={openFile}
        onOpenFolder={openFolder}
        onOpenRecent={openRecent}
        formatPath={ui.formatDisplayPath}
      />
    </div>

  <!-- ─── Editor ──────────────────────────────────────── -->
  {:else}
    <div class="editor-shell">
      <div class="workspace">
        {#if workspace.folderPath && workspace.showSidebar}
          <div
            class="sidebar-shell"
            class:expanded={ui.sidebarChromeVisible}
          >
            <div
              class="sidebar-hover-zone"
              class:active={!ui.sidebarChromeVisible}
              role="presentation"
              onmouseenter={() => (ui.sidebarHovered = true)}
              onmouseleave={() => (ui.sidebarHovered = false)}
            ></div>
            <aside
              class="sidebar"
              onmouseenter={() => (ui.sidebarHovered = true)}
              onmouseleave={() => (ui.sidebarHovered = false)}
            >
              <div class="sidebar-titlebar" data-tauri-drag-region>
                <SidebarToggle
                  onclick={toggleSidebar}
                  title="Hide sidebar (⌘⇧B)"
                />
                <span class="workspace-name" title={workspace.folderPath}>
                  {ui.formatDisplayPath(workspace.folderPath)}
                </span>
              </div>
              <SidebarFileToolbar
                onNewFile={createWorkspaceFile}
                onNewFolder={createWorkspaceFolder}
                onRefresh={refreshFileTree}
                onCollapse={collapseFileTree}
                onAiDrift={runAiDriftCheck}
                aiDriftStatus={driftStatus}
                aiDriftStatusText={driftStatusText}
                aiDriftDraftCount={driftDraftCount}
                aiDriftIsStale={driftIsStale}
                aiDriftIsRunning={driftIsRunning}
                bind:searchQuery={fileTreeSearch}
              />
              <FileTree
                bind:this={fileTree}
                rootPath={workspace.folderPath}
                activeFile={document.filePath}
                filterQuery={fileTreeSearch}
                canUndoDelete={canUndoTrash}
                onSelect={openFileFromTree}
                onMove={handleTreeMove}
                onRename={handleTreeRename}
                onDelete={handleTreeDelete}
                onDuplicate={handleTreeDuplicate}
                onReveal={handleTreeReveal}
                onNewFileIn={createFileInFolder}
                onNewFolderIn={createFolderIn}
                onCopyPath={handleTreeCopyPath}
                onCopyFile={handleTreeCopyFile}
                onUndoDelete={handleUndoDelete}
              />
              <DocumentMetaBar />
            </aside>
          </div>
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
              folderName={folderName}
              isDirty={document.isDirty}
              topbarVisible={topbarVisible}
              hasSidebar={hasSidebar}
              saveStatus={document.saveStatus}
              onOpenSettings={() => workspace.openSettings()}
            />
          </div>

          {#if workspace.folderPath && !workspace.showSidebar}
            <div class="sidebar-toggle-float">
              <SidebarToggle
                variant="float"
                onclick={toggleSidebar}
                title="Show sidebar (⌘⇧B)"
              />
            </div>
          {/if}
 
          <div class="editor-wrap">
            <FindBar
              open={showFind && !!document.filePath && !document.isPreview}
              onClose={() => (showFind = false)}
            />
            {#if document.filePath}
              {#key document.filePath}
                {#if document.isPreview}
                  <DocumentPreview path={document.filePath} />
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
                <span class="folder-prompt-path">{ui.formatDisplayPath(workspace.folderPath)}</span>
              </div>
            {/if}
          </div>
        </div>

        {#if research.showResearch}
          {#key research.sessionId}
            <ResearchPanel onSaveNote={handleSaveNote} />
          {/key}
        {/if}
      </div>

    <!-- outline panel -->
    {#if workspace.showOutline}
      <OutlinePanel />
    {/if}
    </div>
  {/if}

  {#if workspace.showSettings}
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
    border-color: var(--border);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
  }

  .outline-float.active {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    background: var(--accent-dim);
  }

  /* ─── Workspace ──────────────────────────────────────── */
  .workspace {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .sidebar-shell {
    width: 0;
    flex-shrink: 0;
    position: relative;
    z-index: 20;
    height: 100%;
    overflow: visible;
    transition: width 0.24s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar-shell.expanded {
    width: 200px;
    overflow: visible;
  }

  .sidebar-hover-zone {
    display: none;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 12px;
    z-index: 2;
  }

  .sidebar-hover-zone.active {
    display: block;
  }

  .sidebar {
    width: 200px;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border-right: 1px solid var(--border);
    overflow: visible;
    position: absolute;
    left: 0;
    top: 0;
    transform: translateX(-100%);
    transition: transform 0.24s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  }

  .sidebar-shell.expanded .sidebar {
    position: relative;
    transform: translateX(0);
    pointer-events: auto;
  }

  .sidebar-titlebar {
    position: relative;
    display: flex;
    align-items: center;
    height: 38px;
    flex-shrink: 0;
    padding-right: 8px;
    -webkit-app-region: drag;
  }

  .sidebar-titlebar :global(.sidebar-toggle) {
    position: absolute;
    left: 78px;
    top: 50%;
    transform: translateY(-50%);
  }

  .workspace-name {
    margin-left: 106px;
    min-width: 0;
    flex: 1;
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
    letter-spacing: 0.01em;
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
