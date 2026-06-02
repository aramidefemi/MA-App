<script>
  import { FilePlus, FolderMinus, FolderPlus, RefreshCw, Target } from '@lucide/svelte'
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
        <Target size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </Tooltip>
    <WordGoalPopover anchor={goalBtn} />
  </div>

  <Tooltip text="Create new markdown file" position="bottom">
    <button type="button" class="tool-btn" aria-label="New File" onclick={onNewFile}>
      <FilePlus size={18} strokeWidth={1.5} aria-hidden="true" />
    </button>
  </Tooltip>

  <Tooltip text="Create new folder" position="bottom">
    <button type="button" class="tool-btn" aria-label="New Folder" onclick={onNewFolder}>
      <FolderPlus size={18} strokeWidth={1.5} aria-hidden="true" />
    </button>
  </Tooltip>

  <Tooltip text="Refresh file tree" position="bottom">
    <button type="button" class="tool-btn" aria-label="Refresh explorer" onclick={onRefresh}>
      <RefreshCw size={18} strokeWidth={1.5} aria-hidden="true" />
    </button>
  </Tooltip>

  <Tooltip text="Collapse all folders" position="bottom">
    <button type="button" class="tool-btn" aria-label="Collapse all folders" onclick={onCollapse}>
      <FolderMinus size={18} strokeWidth={1.5} aria-hidden="true" />
    </button>
  </Tooltip>
</div>

<style>
  .file-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 2px;
    flex-shrink: 0;
    padding: 2px 4px;
    border-bottom: 1px solid var(--border);
  }

  .goal-anchor {
    position: relative;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
 
    background: none;
    border: none;
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }

  .tool-btn:hover,
  .tool-btn.active {
    color: var(--text);
    border-color: var(--border);
    background: color-mix(in srgb, var(--surface) 92%, var(--text) 8%);
  }

  .tool-btn.active {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
  }
</style>
