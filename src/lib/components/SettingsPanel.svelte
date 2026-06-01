<script>
  import KeySetup from './KeySetup.svelte'
  import { session, persistSession } from '../modules/session'
  import { settings } from '../modules/settings'

  let { onClose } = $props()

  function onTypewriterChange(e) {
    session.setTypewriterScroll(e.currentTarget.checked)
    persistSession()
  }

  function onFocusModeChange(e) {
    session.setFocusMode(e.currentTarget.checked)
    persistSession()
  }
</script>

<div class="backdrop" onclick={() => onClose?.()} role="presentation"></div>

<div
  class="panel"
  role="dialog"
  aria-modal="true"
  aria-labelledby="settings-title"
  tabindex="-1"
>
    <header class="panel-header">
      <h2 id="settings-title" class="panel-title">settings</h2>
      <button type="button" class="close-btn" onclick={() => onClose?.()} aria-label="Close settings">
        ✕
      </button>
    </header>

    <div class="panel-body">
      <section class="section" aria-labelledby="writing-heading">
        <h3 id="writing-heading" class="section-title">Writing</h3>

        <label class="toggle-row">
          <span class="option-label">
            Typewriter scrolling
            <span class="option-hint">Keep the cursor vertically centered as you write</span>
          </span>
          <input
            type="checkbox"
            checked={session.typewriterScroll}
            onchange={onTypewriterChange}
          />
        </label>
        <p class="shortcut-hint"><kbd>⌘⇧T</kbd> toggle typewriter scrolling</p>

        <label class="toggle-row">
          <span class="option-label">
            Focus mode
            <span class="option-hint">Dim blocks away from the cursor</span>
          </span>
          <input
            type="checkbox"
            checked={session.focusMode}
            onchange={onFocusModeChange}
          />
        </label>
        <p class="shortcut-hint"><kbd>⌘⇧F</kbd> toggle focus mode</p>

        <div class="option-block">
          <span class="option-label">Font</span>
          <div class="segmented" role="group" aria-label="Editor font">
            {#each [
              { value: 'monospace', label: 'Monospace' },
              { value: 'serif', label: 'Serif' },
              { value: 'sans', label: 'Sans' },
            ] as opt (opt.value)}
              <button
                type="button"
                class="segment"
                class:active={settings.fontFamily === opt.value}
                aria-pressed={settings.fontFamily === opt.value}
                onclick={() => settings.setFontFamily(opt.value)}
              >
                {opt.label}
              </button>
            {/each}
          </div>
        </div>
      </section>

      <section class="section" aria-labelledby="appearance-heading">
        <h3 id="appearance-heading" class="section-title">Appearance</h3>

        <div class="option-block">
          <span class="option-label">
            Theme
            <span class="option-hint"><kbd>⌘⇧L</kbd> toggle instantly</span>
          </span>
          <div class="segmented" role="group" aria-label="Theme">
            {#each [
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ] as opt (opt.value)}
              <button
                type="button"
                class="segment"
                class:active={settings.theme === opt.value}
                aria-pressed={settings.theme === opt.value}
                onclick={() => settings.setTheme(opt.value)}
              >
                {opt.label}
              </button>
            {/each}
          </div>
        </div>
      </section>

      <section class="section" aria-labelledby="ai-heading">
        <h3 id="ai-heading" class="section-title">AI</h3>
        <KeySetup />
      </section>

      <section class="section" aria-labelledby="account-heading">
        <h3 id="account-heading" class="section-title">Account</h3>

        <div class="placeholder-row">
          <span class="option-label">Connect Google Drive</span>
          <button type="button" class="placeholder-btn" disabled>Coming soon</button>
        </div>

        <div class="placeholder-row">
          <span class="option-label">Sign in with Supabase</span>
          <button type="button" class="placeholder-btn" disabled>Coming soon</button>
        </div>
      </section>
    </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(0, 0, 0, 0.55);
  }

  .panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 51;
    width: min(480px, calc(100vw - 48px));
    max-height: min(80vh, 640px);
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .panel-title {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-dim);
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 12px;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: var(--radius);
    line-height: 1;
    transition: color 0.12s;
  }

  .close-btn:hover {
    color: var(--text);
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section-title {
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-dim);
    margin: 0;
  }

  .option-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .option-label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-family: var(--font-ui);
    font-size: 13px;
    color: var(--text);
  }

  .option-hint {
    font-size: 11px;
    color: var(--text-dim);
    line-height: 1.4;
  }

  .option-hint kbd {
    font-size: 10px;
    padding: 1px 4px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg);
  }

  .toggle-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    cursor: pointer;
  }

  .toggle-row input {
    margin-top: 2px;
    accent-color: var(--accent);
  }

  .shortcut-hint {
    font-family: var(--font-ui);
    font-size: 11px;
    color: var(--text-dim);
    margin: -4px 0 0;
  }

  .shortcut-hint kbd {
    font-size: 10px;
    padding: 1px 5px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg);
  }

  .segmented {
    display: flex;
    gap: 4px;
    padding: 3px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .segment {
    flex: 1;
    padding: 6px 10px;
    background: none;
    border: none;
    border-radius: calc(var(--radius) - 1px);
    font-family: var(--font-ui);
    font-size: 11px;
    color: var(--text-dim);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }

  .segment:hover {
    color: var(--text);
  }

  .segment.active {
    background: var(--surface);
    color: var(--text-heading);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  }

  .placeholder-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .placeholder-btn {
    flex-shrink: 0;
    padding: 5px 10px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-family: var(--font-ui);
    font-size: 10px;
    color: var(--text-dim);
    cursor: not-allowed;
    opacity: 0.7;
  }

  .section :global(.key-section) {
    max-width: none;
  }

  .section :global(.section-title) {
    display: none;
  }
</style>
