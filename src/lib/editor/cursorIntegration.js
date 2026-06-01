import { cursor, dropCursorConfig } from '@milkdown/kit/plugin/cursor'

/** Drop indicator + gap cursor plugins from Milkdown kit. */
export const cursorIntegration = cursor

/** Theme-aligned drop indicator; gap cursor styled in app.css. */
export function configureCursor(ctx) {
  ctx.set(dropCursorConfig.key, {
    width: 2,
    color: false,
    class: 'calm-drop-indicator',
  })
}
