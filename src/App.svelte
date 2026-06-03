<script>
  import { onMount } from 'svelte'
  import { getCurrentWindow } from '@tauri-apps/api/window'
  import { isTauri } from './lib/tauriEnv.js'
  import { setupAppMenu } from './lib/appMenu.js'
  import WelcomeScreen from './lib/components/WelcomeScreen.svelte'
  import SettingsPanel from './lib/components/SettingsPanel.svelte'
  import { displayFileName } from './lib/fileDisplay.js'
  import { settings } from './lib/modules/settings'
  import { research } from './lib/modules/research'
  import { ui } from './lib/modules/ui'
  import { workspace } from './lib/modules/workspace'
  import { initUsageTracking } from './lib/modules/usage'
  import { session } from './lib/modules/session'
  import { createAutosave } from './lib/autosave.js'
  import { document, isUntitled } from './lib/modules/document'
  import { aiDrift } from './lib/modules/aiDrift'
  import { wordGoal } from './lib/modules/wordGoal'
  import { hasTrashedItems } from './lib/workspaceTrash.js'
  import AppShell from './lib/app/AppShell.svelte'
  import EditorWorkspace from './lib/app/EditorWorkspace.svelte'
  import { createFileActions } from './lib/app/fileActions.js'
  import { createWorkspaceTreeActions } from './lib/app/workspaceTreeActions.js'
  import { createKeyboardHandler } from './lib/app/keyboardShortcuts.js'
  import { exportDocx, exportPdf } from './lib/export.js'
  import { createMenuHandlers } from './lib/app/menuHandlers.js'
  import { setupAppEffects } from './lib/app/appEffects.svelte.ts'
  import { invalidateWikilinkIndex } from './lib/wikilinkResolve.js'

  let recentProjects = $state([])
  let wikilinkSyncToken = $state(0)
  let showFind = $state(false)
  let fileTree = $state(null)
  let fileTreeSearch = $state('')
  let canUndoTrash = $state(false)

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
      ? (workspace.folderPath.split('/').pop()?.split('\\').pop() ?? null)
      : null,
  )

  async function refreshTrashState() {
    const root = workspace.folderPath
    canUndoTrash = root ? await hasTrashedItems(root) : false
  }

  function refreshFileTree() {
    invalidateWikilinkIndex()
    wikilinkSyncToken++
    fileTree?.refresh()
    void refreshTrashState()
  }

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

  const file = createFileActions({
    document,
    workspace,
    ui,
    autosave,
    setRecentProjects: (projects) => {
      recentProjects = projects
    },
    refreshFileTree,
    refreshTrashState,
  })

  const tree = createWorkspaceTreeActions({
    workspace,
    document,
    refreshFileTree,
    refreshTrashState,
    collapseFileTree: () => fileTree?.collapseAll(),
    openFileFromTree: (path) => file.openFileFromTree(path),
  })

  const onKeydown = createKeyboardHandler({
    workspace,
    session,
    settings,
    document,
    research,
    getFileName: () => fileName,
    actions: {
      newFile: () => file.newFile(),
      saveFile: () => file.saveFile(),
      openFile: () => file.openFile(),
      openFolder: () => file.openFolder(),
      closeTab: () => file.closeTab(),
      closeAll: () => file.closeAll(),
      toggleFind: () => {
        if (document.filePath && !document.isPreview) showFind = true
      },
      onEscape: () => {
        if (showFind) showFind = false
        else if (workspace.showSettings) workspace.closeSettings()
        else if (workspace.showOutline) workspace.closeOutline()
      },
    },
  })

  setupAppEffects({
    document,
    workspace,
    research,
    session,
    autosave,
    revealTargetPath: () => file.revealTargetPath(),
  })

  onMount(() => {
    if (!isTauri() || getCurrentWindow().label !== 'main') return
    return initUsageTracking()
  })

  onMount(() => {
    void (async () => {
      await file.loadRecentOnStartup()
      await setupAppMenu(
        createMenuHandlers({
          file,
          document,
          workspace,
          session,
          settings,
          getFileName: () => fileName,
          createWorkspaceFile: () => tree.createFileInFolder(workspace.folderPath),
          toggleSidebar: () => {
            workspace.toggleSidebar()
            if (workspace.showSidebar) ui.resetSidebar()
          },
          openFind: () => {
            if (document.filePath && !document.isPreview) showFind = true
          },
        }),
      )
    })()
  })

  function handleContentChange(markdown) {
    aiDrift.notifyContentChange(markdown)
    ui.handleTopbarOnEdit()
    ui.handleSidebarOnEdit()
    ui.handleRightRailOnEdit()
    autosave.schedule()
  }
</script>

<svelte:window onkeydown={onKeydown} />

<AppShell {showWelcome}>
  {#snippet welcome()}
    <WelcomeScreen
      {recentProjects}
      onStartWriting={() => file.startWriting()}
      onOpenFile={() => file.openFile()}
      onOpenFolder={() => file.openFolder()}
      onOpenRecent={(p) => file.openRecent(p)}
      formatPath={ui.formatDisplayPath}
    />
  {/snippet}

  {#snippet editor()}
    <EditorWorkspace
      {hasSidebar}
      {topbarVisible}
      {fileName}
      {folderName}
      {showFind}
      bind:fileTree
      bind:fileTreeSearch
      {canUndoTrash}
      onToggleSidebar={() => {
        workspace.toggleSidebar()
        if (workspace.showSidebar) ui.resetSidebar()
        ui.resetRightRail()
      }}
      onContentChange={handleContentChange}
      onAiClick={(text) => {
        workspace.closeOutline()
        research.openWithText(text)
      }}
      onSaveNote={(ctx, res) => file.saveResearchNote(ctx, res)}
      onCloseFind={() => (showFind = false)}
      onOpenFind={() => {
        if (document.filePath && !document.isPreview) showFind = true
      }}
      onExportDocx={() => exportDocx(document.content, fileName ?? 'document')}
      onExportPdf={() => exportPdf(document.content, fileName ?? 'document')}
      onOpenFileFromTree={(path) => file.openFileFromTree(path)}
      onOpenWikilink={(target) => file.openWikilink(target)}
      {wikilinkSyncToken}
      onNewFile={() => tree.createFileInFolder(workspace.folderPath)}
      onNewFolder={() => tree.createFolderIn(workspace.folderPath)}
      onRefreshTree={refreshFileTree}
      onCollapseTree={() => fileTree?.collapseAll()}
      onTreeMove={tree.move}
      onTreeRename={tree.rename}
      onTreeDelete={tree.remove}
      onTreeDuplicate={tree.duplicate}
      onTreeReveal={tree.reveal}
      onNewFileIn={tree.createFileInFolder}
      onNewFolderIn={tree.createFolderIn}
      onCopyPath={tree.copyPath}
      onCopyFile={tree.copyFile}
      onUndoDelete={tree.undoDelete}
    />
  {/snippet}

  {#snippet settings()}
    {#if workspace.showSettings}
      <SettingsPanel onClose={() => workspace.closeSettings()} />
    {/if}
  {/snippet}
</AppShell>
