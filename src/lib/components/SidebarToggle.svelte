<script>
  let {
    onclick,
    title = 'Toggle sidebar (⌘B)',
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
  <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="0.75" y="0.75" width="14.5" height="12.5" rx="2.5" stroke="currentColor" stroke-width="1.25"/>
    <rect x="1.75" y="2.25" width="4.25" height="9.5" rx="0.75" fill="currentColor"/>
  </svg>
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
