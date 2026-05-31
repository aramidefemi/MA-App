<script>
  import { onMount } from 'svelte'
  import { clearApiKey, saveApiKey } from '../services/keys.js'
  import { hasKey } from '../services/ai.js'

  let value = $state('')
  let error = $state('')
  let saving = $state(false)
  let keySaved = $state(false)

  onMount(async () => {
    keySaved = await hasKey()
  })

  async function handleSave() {
    if (!value.trim() || saving) return
    saving = true
    error = ''
    try {
      await saveApiKey(value)
      keySaved = true
      value = ''
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save key'
    } finally {
      saving = false
    }
  }

  async function handleClear() {
    if (saving) return
    saving = true
    error = ''
    try {
      await clearApiKey()
      keySaved = false
      value = ''
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to remove key'
    } finally {
      saving = false
    }
  }
</script>

<section class="key-section" aria-labelledby="nvidia-key-heading">
  <h2 id="nvidia-key-heading" class="section-title">NVIDIA API key</h2>
  <p class="section-desc">
    AI works without a key using Ma’s shared quota. Add your own key for unlimited use (stored securely on Ma’s server, not on this device).
  </p>

  {#if keySaved}
    <p class="status">Your key is saved. Requests use your NVIDIA account via Ma’s secure proxy.</p>
    <button type="button" class="secondary" disabled={saving} onclick={handleClear}>
      {saving ? 'Removing…' : 'Remove key'}
    </button>
  {:else}
    <input
      class="input"
      type="password"
      placeholder="nvapi-…"
      bind:value
      autocomplete="off"
      spellcheck="false"
    />
    {#if error}
      <p class="error">{error}</p>
    {/if}
    <button
      type="button"
      class="save"
      disabled={!value.trim() || saving}
      onclick={handleSave}
    >
      {saving ? 'Saving…' : 'Save key'}
    </button>
  {/if}

  <a
    class="link"
    href="https://build.nvidia.com"
    target="_blank"
    rel="noopener noreferrer"
  >
    Get a key at build.nvidia.com
  </a>
</section>

<style>
  .key-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 420px;
    width: 100%;
  }

  .section-title {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text);
  }

  .section-desc,
  .status {
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--text-dim);
  }

  .status {
    color: var(--accent);
  }

  .error {
    font-size: 0.75rem;
    line-height: 1.4;
    color: #e57373;
  }

  .input {
    width: 100%;
    padding: 0.625rem 0.75rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 0.8125rem;
    outline: none;
  }

  .input:focus {
    border-color: var(--accent);
  }

  .save,
  .secondary {
    align-self: flex-start;
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    font-family: var(--font-ui);
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
  }

  .save {
    background: var(--accent);
    border: none;
    color: var(--bg);
  }

  .save:disabled {
    background: var(--accent-dim);
    color: var(--text-dim);
    cursor: not-allowed;
  }

  .save:not(:disabled):hover {
    filter: brightness(1.05);
  }

  .secondary {
    background: none;
    border: 1px solid var(--border);
    color: var(--text-dim);
  }

  .secondary:not(:disabled):hover {
    color: var(--text);
    border-color: #333;
  }

  .link {
    font-size: 0.75rem;
    color: var(--text-dim);
    text-decoration: none;
  }

  .link:hover {
    color: var(--accent);
  }
</style>
