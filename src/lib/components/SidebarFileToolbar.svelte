<script>
  import Tooltip from './Tooltip.svelte'
  import WordGoalPopover from './WordGoalPopover.svelte'
  import { wordGoal } from '../modules/wordGoal'

  let {
    onNewFile = () => {},
    onNewFolder = () => {},
    onRefresh = () => {},
    onCollapse = () => {},
  } = $props()

  let goalBtn = $state(null)
</script>

<div class="file-toolbar" role="toolbar" aria-label="File explorer actions">
  <div class="goal-anchor">
    <Tooltip text="Set word goal" position="bottom">
      <button
        type="button"
        class="tool-btn"
        class:active={wordGoal.isActive}
        aria-label="Set word goal"
        aria-expanded={wordGoal.showPopover}
        bind:this={goalBtn}
        onclick={() => wordGoal.togglePopover()}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
          <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      </button>
    </Tooltip>
    <WordGoalPopover anchor={goalBtn} />
  </div>

  <Tooltip text="Create new markdown file" position="bottom">
    <button type="button" class="tool-btn" aria-label="New File" onclick={onNewFile}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
        <path d="M14 2v6h6M12 18v-6M9 15h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>
  </Tooltip>

  <Tooltip text="Create new folder" position="bottom">
    <button type="button" class="tool-btn" aria-label="New Folder" onclick={onNewFolder}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.5a2 2 0 0 1-1.6-.8L9.2 4.8A2 2 0 0 0 7.6 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
        <path d="M12 11v6M9 14h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>
  </Tooltip>

  <Tooltip text="Refresh file tree" position="bottom">
    <button type="button" class="tool-btn" aria-label="Refresh explorer" onclick={onRefresh}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M21 12a9 9 0 1 1-2.64-6.36"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path d="M21 3v6h-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </Tooltip>

  <Tooltip text="Collapse all folders" position="bottom">
    <button type="button" class="tool-btn" aria-label="Collapse all folders" onclick={onCollapse}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.5a2 2 0 0 1-1.6-.8L9.2 4.8A2 2 0 0 0 7.6 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
        <path d="M9 14h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>
  </Tooltip>
</div>

<style>
  .file-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    flex-shrink: 0;
    padding: 6px 8px;
    border-bottom: 1px solid var(--border);
  }

  .goal-anchor {
    position: relative;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    padding: 0;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }

  .tool-btn:hover,
  .tool-btn.active {
    color: var(--text);
    border-color: #333;
    background: color-mix(in srgb, var(--surface) 92%, var(--text) 8%);
  }

  .tool-btn.active {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
  }
</style>
