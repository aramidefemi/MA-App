<script lang="ts">
  import { GOAL_PRESETS, wordGoal } from '../modules/wordGoal'

  const POPOVER_WIDTH = 160

  let { anchor = null }: { anchor?: HTMLElement | null } = $props()

  let customValue = $state('')
  let popoverEl = $state<HTMLElement | null>(null)
  let popoverStyle = $state('')

  function confirmGoal(value: string | number) {
    const n = Number(value)
    if (Number.isFinite(n) && n > 0) wordGoal.setGoal(n)
  }

  function handlePreset(preset: number) {
    confirmGoal(preset)
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmGoal(customValue)
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      wordGoal.closePopover()
    }
  }

  function handleClickOutside(e: PointerEvent) {
    if (!popoverEl || !anchor) return
    const target = e.target
    if (target instanceof Node && (popoverEl.contains(target) || anchor.contains(target))) return
    wordGoal.closePopover()
  }

  function updatePosition() {
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const left = Math.max(8, Math.min(rect.right - POPOVER_WIDTH, window.innerWidth - POPOVER_WIDTH - 8))
    const top = rect.bottom + 6
    popoverStyle = `top:${top}px;left:${left}px;width:${POPOVER_WIDTH}px;`
  }

  $effect(() => {
    if (!wordGoal.showPopover || !anchor) return
    customValue = wordGoal.goal ? String(wordGoal.goal) : ''

    const onPointerDown = (e: PointerEvent) => handleClickOutside(e)
    const onLayoutChange = () => updatePosition()

    updatePosition()
    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('resize', onLayoutChange)
    window.addEventListener('scroll', onLayoutChange, true)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('resize', onLayoutChange)
      window.removeEventListener('scroll', onLayoutChange, true)
    }
  })

  $effect(() => {
    if (popoverEl && wordGoal.showPopover) updatePosition()
  })
</script>

{#if wordGoal.showPopover && anchor}
  <div
    bind:this={popoverEl}
    class="goal-popover"
    style={popoverStyle || undefined}
    role="dialog"
    aria-label="Set word goal"
  >
    <p class="goal-label">Word goal</p>
    <div class="presets">
      {#each GOAL_PRESETS as preset (preset)}
        <button type="button" class="preset-btn" onclick={() => handlePreset(preset)}>
          {preset}
        </button>
      {/each}
    </div>
    <input
      type="number"
      class="custom-input"
      min="1"
      placeholder="Custom"
      bind:value={customValue}
      onkeydown={handleKeydown}
    />
  </div>
{/if}

<style>
  .goal-popover {
    position: fixed;
    z-index: 200;
    padding: 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 8px 24px rgb(0 0 0 / 45%);
    font-family: var(--font-ui);
  }

  .goal-label {
    margin-bottom: 8px;
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .presets {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
  }

  .preset-btn {
    flex: 1;
    padding: 5px 0;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-family: inherit;
    font-size: 11px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }

  .preset-btn:hover {
    color: var(--text-heading);
    border-color: #333;
    background: color-mix(in srgb, var(--surface) 92%, var(--text) 8%);
  }

  .custom-input {
    width: 100%;
    padding: 5px 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-heading);
    font-family: inherit;
    font-size: 11px;
    outline: none;
  }

  .custom-input::placeholder {
    color: var(--text-dim);
  }

  .custom-input:focus {
    border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  }

  .custom-input::-webkit-outer-spin-button,
  .custom-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .custom-input[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;
  }
</style>
