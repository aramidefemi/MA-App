<script>
  import Editor from '../components/Editor.svelte'
  import DocumentPreview from '../components/DocumentPreview.svelte'
  import FileTree from '../components/FileTree.svelte'
  import SidebarFileToolbar from '../components/SidebarFileToolbar.svelte'
  import SidebarToggle from '../components/SidebarToggle.svelte'
  import DocumentMetaBar from '../components/DocumentMetaBar.svelte'
  import EditorTopbar from '../components/EditorTopbar.svelte'
  import FindBar from '../components/FindBar.svelte'
  import OutlinePanel from '../components/OutlinePanel.svelte'
  import RightEditorRail from '../components/RightEditorRail.svelte'
  import ResearchPanel from '../components/ResearchPanel.svelte'
  import { research } from '../modules/research'
  import { ui } from '../modules/ui'
  import { workspace } from '../modules/workspace'
  import { document } from '../modules/document'
  import { aiDrift } from '../modules/aiDrift'

  let {
    hasSidebar,
    topbarVisible,
    fileName,
    folderName,
    showFind,
    onToggleSidebar,
    onContentChange,
    onAiClick,
    onSaveNote,
    onCloseFind,
    onExportDocx,
    onExportPdf,
    onOpenFind,
    onOpenFileFromTree,
    onOpenWikilink,
    wikilinkSyncToken = 0,
    fileTreeSearch = $bindable(''),
    fileTree = $bindable(null),
    canUndoTrash,
    onNewFile,
    onNewFolder,
    onRefreshTree,
    onCollapseTree,
    onTreeMove,
    onTreeRename,
    onTreeDelete,
    onTreeDuplicate,
    onTreeReveal,
    onNewFileIn,
    onNewFolderIn,
    onCopyPath,
    onCopyFile,
    onUndoDelete,
  } = $props()
</script>

<div class="workspace">
  {#if workspace.folderPath && workspace.showSidebar}
    <div class="sidebar-shell" class:expanded={ui.sidebarChromeVisible}>
      <div
        class="sidebar-hover-zone"
        class:active={!ui.sidebarChromeVisible}
        role="presentation"
        onmouseenter={ui.revealSidebarOnHover}
        onmouseleave={ui.endSidebarHover}
      ></div>
      <aside
        class="sidebar"
        onmouseenter={ui.revealSidebarOnHover}
        onmouseleave={ui.endSidebarHover}
      >
        <div class="sidebar-titlebar" data-tauri-drag-region>
          <SidebarToggle onclick={onToggleSidebar} title="Hide sidebar (⌘⇧B)" />
          <span class="workspace-name" title={workspace.folderPath}>
            {ui.formatDisplayPath(workspace.folderPath)}
          </span>
        </div>
        <SidebarFileToolbar
          onNewFile={onNewFile}
          onNewFolder={onNewFolder}
          onRefresh={onRefreshTree}
          onCollapse={onCollapseTree}
          bind:searchQuery={fileTreeSearch}
        />
        <FileTree
          bind:this={fileTree}
          rootPath={workspace.folderPath}
          activeFile={document.filePath}
          filterQuery={fileTreeSearch}
          {canUndoTrash}
          onSelect={onOpenFileFromTree}
          onMove={onTreeMove}
          onRename={onTreeRename}
          onDelete={onTreeDelete}
          onDuplicate={onTreeDuplicate}
          onReveal={onTreeReveal}
          onNewFileIn={onNewFileIn}
          onNewFolderIn={onNewFolderIn}
          onCopyPath={onCopyPath}
          onCopyFile={onCopyFile}
          onUndoDelete={onUndoDelete}
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
        {fileName}
        {folderName}
        isDirty={document.isDirty}
        {topbarVisible}
        {hasSidebar}
        saveStatus={document.saveStatus}
        onOpenSettings={() => workspace.openSettings()}
      />
    </div>

    {#if workspace.folderPath && !workspace.showSidebar}
      <div class="sidebar-toggle-float">
        <SidebarToggle
          variant="float"
          onclick={onToggleSidebar}
          title="Show sidebar (⌘⇧B)"
        />
      </div>
    {/if}

    <div class="editor-row">
      <div class="editor-wrap">
        <FindBar
          open={showFind && !!document.filePath && !document.isPreview}
          onClose={onCloseFind}
        />
        {#if document.filePath}
          {#key document.filePath}
            {#if document.isPreview}
              <DocumentPreview path={document.filePath} />
            {:else}
              <Editor
                onContentChange={onContentChange}
                onAiClick={onAiClick}
                onOpenWikilink={onOpenWikilink}
                {wikilinkSyncToken}
                driftIssues={aiDrift.visibleIssues}
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

      {#if workspace.showOutline}
        <OutlinePanel />
      {/if}

      {#if research.showResearch}
        {#key research.sessionId}
          <ResearchPanel onSaveNote={onSaveNote} />
        {/key}
      {/if}

      <RightEditorRail
        visible={!!workspace.folderPath}
        canUseEditor={!!document.filePath && !document.isPreview}
        onExportDocx={onExportDocx}
        onExportPdf={onExportPdf}
        onOpenFind={onOpenFind}
      />
    </div>
  </div>
</div>

<style>
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

  .editor-row {
    flex: 1;
    display: flex;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .editor-wrap {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
    min-height: 0;
    min-width: 0;
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
