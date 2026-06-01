<script>
  import { PanelLeft } from '@lucide/svelte'

  let {
    onclick,
    title = 'Toggle sidebar (⌘⇧B)',
    variant = 'inline',
    class: className = '',
  } = $props()
</script>

<button
  type="button"
  class="sidebar-toggle {variant} {className}"
  {onclick}
  {title}
  aria-label={title}
>
  <PanelLeft size={16} strokeWidth={1.25} aria-hidden="true" />
</button>

<style>
  .sidebar-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 5px;
    background: none;
    border: none;
    color: var(--text-dim);
    border-radius: var(--radius);
    cursor: pointer;
    -webkit-app-region: no-drag;
    transition: color 0.15s, background 0.15s, border-color 0.15s, box-shadow 0.15s;
  }

  .sidebar-toggle:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--surface) 92%, var(--text) 8%);
  }

  .sidebar-toggle.float {
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    padding: 5px 7px;
  }

  .sidebar-toggle.float:hover {
    border-color: #333;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
  }
</style>
