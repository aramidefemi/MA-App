<script>
  import {
    Code,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Minus,
    Quote,
  } from '@lucide/svelte'

  /** @type {{ actions: import('../editor/slashIntegration.js').SlashActions, hide: () => void }} */
  let { actions, hide } = $props()

  const menuDefs = [
    { id: 'h1', label: 'Heading 1', icon: Heading1, action: 'heading1' },
    { id: 'h2', label: 'Heading 2', icon: Heading2, action: 'heading2' },
    { id: 'h3', label: 'Heading 3', icon: Heading3, action: 'heading3' },
    { id: 'bullet', label: 'Bullet list', icon: List, action: 'bulletList' },
    { id: 'ordered', label: 'Numbered list', icon: ListOrdered, action: 'orderedList' },
    { id: 'quote', label: 'Quote', icon: Quote, action: 'blockquote' },
    { id: 'code', label: 'Code block', icon: Code, action: 'codeBlock' },
    { id: 'hr', label: 'Divider', icon: Minus, action: 'hr' },
  ]

  /** @param {keyof import('../editor/slashIntegration.js').SlashActions} key */
  function select(key) {
    actions[key]()
    hide()
  }

  /** @param {MouseEvent} e */
  function handleMouseDown(e) {
    e.preventDefault()
  }

</script>

<div class="slash-menu" aria-label="Insert block">
  {#each menuDefs as item (item.id)}
    <button
      type="button"
      class="item"
      onmousedown={handleMouseDown}
      onclick={() => select(/** @type {keyof import('../editor/slashIntegration.js').SlashActions} */ (item.action))}
    >
      <item.icon size={16} strokeWidth={2} aria-hidden="true" />
      <span>{item.label}</span>
    </button>
  {/each}
</div>

<style>
  .slash-menu {
    display: flex;
    flex-direction: column;
    min-width: 200px;
    padding: 6px;
    border-radius: 10px;
    background: var(--bubble-bg, #fff);
    border: 1px solid var(--bubble-border, #e5e5e5);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    font-family: var(--font-ui, system-ui, sans-serif);
    font-size: 13px;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--bubble-text, #333);
    text-align: left;
    cursor: pointer;
    transition: background 0.1s;
  }

  .item:hover {
    background: var(--bubble-hover, #f0f0f0);
    color: var(--bubble-text-hover, #111);
  }

  .item :global(svg) {
    flex-shrink: 0;
    opacity: 0.7;
  }
</style>
