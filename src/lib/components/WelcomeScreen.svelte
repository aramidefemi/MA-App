<script>
  import { FileText, FolderOpen, PenLine } from '@lucide/svelte'
  import { app } from '../app.js'
  import appIcon from '../../../app-icon.svg'

  /** @type {{
    recentProjects?: import('../recentProjects.js').RecentProject[],
    onStartWriting: () => void,
    onOpenFile: () => void,
    onOpenFolder: () => void,
    onOpenRecent?: (project: import('../recentProjects.js').RecentProject) => void,
    formatPath?: (path: string) => string,
  }} */
  let {
    recentProjects = [],
    onStartWriting,
    onOpenFile,
    onOpenFolder,
    onOpenRecent,
    formatPath = (path) => path,
  } = $props()
</script>

<div class="welcome">
  <header class="brand">
    <img class="logo" src={appIcon} alt="{app.displayName} logo" width="44" height="44" />
   
    <p class="tagline">
      Google Docs is perfect when six people need the same doc.<br />
      Ma is for when it's just you — open a file, write, done. No account, no ribbon, no loading bar.
    </p>
  </header>

  <div class="actions">
    <button type="button" class="action-card" onclick={onStartWriting}>
      <span class="action-icon" aria-hidden="true">
        <PenLine size={20} strokeWidth={1.5} />
      </span>
      <span class="action-label">Start writing</span>
    </button>

    <button type="button" class="action-card" onclick={onOpenFile}>
      <span class="action-icon" aria-hidden="true">
        <FileText size={20} strokeWidth={1.5} />
      </span>
      <span class="action-label">Open file</span>
    </button>

    <button type="button" class="action-card" onclick={onOpenFolder}>
      <span class="action-icon" aria-hidden="true">
        <FolderOpen size={20} strokeWidth={1.5} />
      </span>
      <span class="action-label">Open folder</span>
    </button>
  </div>

  {#if recentProjects.length > 0 && onOpenRecent}
    <section class="recent">
      <div class="recent-header">
        <h2>Recent projects</h2>
      </div>
      <ul class="recent-list">
        {#each recentProjects as project (project.path)}
          <li>
            <button
              type="button"
              class="recent-item"
              onclick={() => onOpenRecent(project)}
            >
              <span class="recent-name">{project.name}</span>
              <span class="recent-path">{formatPath(project.path)}</span>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <div class="hints">
    <kbd>⌘N</kbd> start writing &nbsp;·&nbsp; <kbd>⌘O</kbd> open file &nbsp;·&nbsp; <kbd>⌘⇧O</kbd> open folder
  </div>
</div>

<style>
  .welcome {
    width: min(580px, 100%);
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .brand {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .logo {
    width: 44px;
    height: 44px;
    display: block;
    border-radius: 10px;
  }

  .brand h1 {
    font-family: var(--crepe-font-title);
    font-size: 22px;
    font-weight: var(--crepe-weight-bold);
    letter-spacing: var(--crepe-tracking-normal);
    color: var(--text-heading);
    text-transform: uppercase;
  }

  .tagline {
    font-family: var(--crepe-font-default);
    font-size: var(--crepe-size-ui);
    font-weight: var(--crepe-weight-regular);
    color: var(--text-dim);
    line-height: 1.6;
  }

  .actions {
    display: flex;
    gap: 12px;
  }

  .action-card {
    flex: 1;
    min-height: 88px;
    border: none;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    background: var(--surface); 
    border-radius: 8px;
    color: var(--text);
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, border-color 0.15s;
  }

  .action-card:hover {
    background: var(--crepe-color-hover);
    border-color: var(--border);
  }

  .action-icon {
    color: var(--text-dim);
    display: flex;
  }

  .action-card:hover .action-icon {
    color: var(--text);
  }

  .action-label {
    font-family: var(--crepe-font-default);
    font-size: var(--crepe-size-md);
    font-weight: var(--crepe-weight-medium);
    letter-spacing: var(--crepe-tracking-tight);
  }

  .recent-header h2 {
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-dim);
  }

  .recent-list {
    list-style: none;
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .recent-item {
    width: 100%;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    padding: 8px 6px;
    margin: 0 -6px;
    background: none;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    text-align: left;
    transition: background 0.12s;
  }

  .recent-item:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .recent-name {
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    font-size: 13px;
    color: var(--text-heading);
    flex-shrink: 0;
  }

  .recent-path {
    font-family: var(--font-ui);
    font-size: 11px;
    color: var(--text-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    text-align: right;
  }

  .hints {
    font-size: var(--crepe-size-caption);
    font-weight: var(--crepe-weight-regular);
    color: var(--text-dim);
    letter-spacing: var(--crepe-tracking-wide);
  }

  kbd {
    font-family: var(--font-code);
    font-size: 9px;
    font-weight: var(--crepe-weight-medium);
    background: var(--surface); 
    padding: 1px 5px;
    border-radius: 3px;
    color: var(--text-dim);
  }
</style>
