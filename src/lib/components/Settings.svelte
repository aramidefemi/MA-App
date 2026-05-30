<script>
  let { onBack } = $props()
</script>

<div class="settings">
  <header class="settings-header">
    <button type="button" class="back-btn" onclick={() => onBack?.()} aria-label="Back to editor">
      ←
    </button>
    <h1 class="settings-title">settings</h1>
  </header>

  <div class="settings-body">
    <p class="placeholder">Nothing here yet.</p>
  </div>
</div>

<style>
  .settings {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg);
  }

  .settings-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 24px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .back-btn {
    background: none;
    border: 1px solid var(--border);
    color: var(--text-dim);
    font-family: var(--font-ui);
    font-size: 12px;
    padding: 4px 10px;
    border-radius: var(--radius);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .back-btn:hover {
    color: var(--text);
    border-color: #333;
  }

  .settings-title {
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .settings-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .placeholder {
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--text-dim);
    letter-spacing: 0.02em;
  }
</style>
