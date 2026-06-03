<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    text,
    position = 'top',
    fill = false,
    class: className = '',
    children,
  }: {
    text: string
    position?: 'top' | 'bottom' | 'left'
    fill?: boolean
    class?: string
    children: Snippet
  } = $props()
</script>

<span class="tooltip-wrap {className}" class:fill data-position={position}>
  {@render children()}
  <span class="tooltip" role="tooltip">{text}</span>
</span>

<style>
  .tooltip-wrap {
    position: relative;
    display: inline-flex;
  }

  .tooltip-wrap.fill {
    flex: 1;
    min-width: 0;
  }

  .tooltip-wrap.fill > :global(button) {
    width: 100%;
  }

  .tooltip {
    position: absolute;
    left: 50%;
    z-index: 200;
    width: max-content;
    max-width: min(280px, 90vw);
    padding: 5px 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    line-height: 1.35;
    text-align: center;
    white-space: normal;
    overflow-wrap: anywhere;
    pointer-events: none;
    opacity: 0;
    box-shadow: 0 4px 12px rgb(0 0 0 / 35%);
    transition: opacity 0.12s ease;
    transform: translateX(-50%);
  }

  .tooltip-wrap[data-position='top'] .tooltip {
    bottom: calc(100% + 6px);
  }

  .tooltip-wrap[data-position='bottom'] .tooltip {
    top: calc(100% + 6px);
  }

  .tooltip-wrap[data-position='left'] .tooltip {
    left: auto;
    right: calc(100% + 8px);
    top: 50%;
    bottom: auto;
    transform: translateY(-50%);
    text-align: left;
  }

  .tooltip-wrap:hover .tooltip,
  .tooltip-wrap:focus-within .tooltip {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .tooltip {
      transition: none;
    }
  }
</style>
